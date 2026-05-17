import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { sendPaymentDeclarationEmail, getLang } from "@/app/lib/emailService";
import { sendSmsToPhone } from "@/app/lib/smsService";
import { DEFAULT_PAYMENT_CONFIGS, getBourseServiceType } from "@/app/types/payment-config";

const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: NextRequest) {
    try {
        const cookieStore = await cookies();
        const supabase = createServerClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
            { cookies: { getAll() { return cookieStore.getAll(); }, setAll() {} } }
        );

        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

        const { data: student } = await supabaseAdmin
            .from("students")
            .select("id, niveau, nationalite")
            .or(`created_by.eq.${user.id},user_id.eq.${user.id}`)
            .single();

        if (!student) return NextResponse.json({ error: "Aucun dossier étudiant trouvé" }, { status: 404 });

        const {
            payment_id,
            type,
            tranche_num,
            montant_declare,
            montant_tranche,
            proof_url,
            is_avance,
        } = await req.json();

        if (!type || !tranche_num || !montant_declare) {
            return NextResponse.json({ error: "Paramètres manquants" }, { status: 400 });
        }

        let paymentId: string;

        if (payment_id) {
            // Vérifier que ce paiement appartient bien à cet étudiant
            const { data: existing } = await supabaseAdmin
                .from("payments")
                .select("id, status")
                .eq("id", payment_id)
                .eq("student_id", student.id)
                .single();

            if (!existing) return NextResponse.json({ error: "Paiement introuvable" }, { status: 404 });
            if (existing.status === "paye") {
                return NextResponse.json({ error: "Ce paiement est déjà validé" }, { status: 400 });
            }
            if (existing.status === "en_validation") {
                return NextResponse.json({ error: "Ce paiement est déjà en cours de validation" }, { status: 400 });
            }
            paymentId = payment_id;
        } else {
            // Chercher un paiement existant pour cette tranche
            const { data: found } = await supabaseAdmin
                .from("payments")
                .select("id, status")
                .eq("student_id", student.id)
                .eq("type", type)
                .eq("tranche", tranche_num)
                .maybeSingle();

            if (found) {
                if (found.status === "paye") {
                    return NextResponse.json({ error: "Ce paiement est déjà validé" }, { status: 400 });
                }
                if (found.status === "en_validation") {
                    return NextResponse.json({ error: "Ce paiement est déjà en cours de validation" }, { status: 400 });
                }
                paymentId = found.id;
            } else {
                // Créer le paiement à la volée
                const serviceType = type === "bourse"
                    ? getBourseServiceType(student.niveau, student.nationalite)
                    : (type as "mandarin" | "anglais");
                const cfg = DEFAULT_PAYMENT_CONFIGS[serviceType];
                const deadlineDays = cfg?.deadline_offset_days ?? 30;
                const dateLimite = new Date(Date.now() + deadlineDays * 24 * 60 * 60 * 1000)
                    .toISOString().split("T")[0];

                const { data: created, error: createErr } = await supabaseAdmin
                    .from("payments")
                    .insert({
                        student_id: student.id,
                        type,
                        tranche: tranche_num,
                        montant: montant_tranche ?? montant_declare,
                        status: "attente",
                        penalites: 0,
                        date_limite: dateLimite,
                    })
                    .select("id")
                    .single();

                if (createErr || !created) {
                    return NextResponse.json({ error: "Impossible de créer le paiement" }, { status: 500 });
                }
                paymentId = created.id;
            }
        }

        // Passer en validation
        const updates: Record<string, unknown> = {
            status: "en_validation",
            initiated_by_student: true,
        };
        if (proof_url) updates.facture_url = proof_url;

        await supabaseAdmin.from("payments").update(updates).eq("id", paymentId);

        // Notifier le staff
        const { data: staffUsers } = await supabaseAdmin
            .from("users")
            .select("id")
            .in("role", ["admin", "super_admin", "agent", "supervisor"]);

        if (staffUsers && staffUsers.length > 0) {
            const { data: studentUser } = await supabaseAdmin
                .from("users").select("name").eq("id", user.id).single();

            const studentName = studentUser?.name ?? "Un étudiant";
            const typeLabel = type === "bourse" ? "Procédure Bourse"
                : type === "mandarin" ? "Cours Mandarin"
                : "Cours Anglais";
            const modeLabel = is_avance
                ? `acompte de ${montant_declare.toLocaleString("fr-FR")} FCFA`
                : `paiement complet de ${montant_declare.toLocaleString("fr-FR")} FCFA`;

            await supabaseAdmin.from("notifications").insert(
                staffUsers.map((staff: { id: string }) => ({
                    user_id: staff.id,
                    type: "paiement_valide",
                    titre: "Déclaration de paiement",
                    message: `${studentName} a déclaré un ${modeLabel} pour ${typeLabel} — Tranche ${tranche_num}. En attente de validation.`,
                    read: false,
                    metadata: { payment_id: paymentId, student_id: student.id, montant_declare },
                }))
            );
        }

        // Récupérer email + téléphone de l'étudiant pour le notifier
        const { data: studentInfo } = await supabaseAdmin
            .from("students")
            .select("nom, prenom, email, telephone, langue")
            .eq("id", student.id)
            .maybeSingle();

        if (studentInfo) {
            const lang = getLang(studentInfo.langue);
            const isEn = lang === "en";
            const studentName = `${studentInfo.prenom ?? ""} ${studentInfo.nom ?? ""}`.trim();
            const typeLabels: Record<string, Record<"fr" | "en", string>> = {
                bourse:   { fr: "Procédure Bourse", en: "Scholarship Procedure" },
                mandarin: { fr: "Cours Mandarin",   en: "Mandarin Course" },
                anglais:  { fr: "Cours Anglais",    en: "English Course" },
            };
            const typeLabel = typeLabels[type]?.[lang] ?? type;
            const formattedAmount = new Intl.NumberFormat("fr-FR").format(montant_declare);
            const instalment = isEn ? "Instalment" : "Tranche";

            // SMS à l'étudiant
            if (studentInfo.telephone) {
                const smsText = isEn
                    ? `Hello ${studentName}, your payment declaration ${typeLabel} - ${instalment} ${tranche_num} (${formattedAmount} FCFA) has been received. Awaiting validation by our team.`
                    : `Bonjour ${studentName}, votre déclaration de paiement ${typeLabel} - Tranche ${tranche_num} (${formattedAmount} FCFA) a bien été reçue. En attente de validation par notre équipe.`;
                sendSmsToPhone(studentInfo.telephone, smsText).catch(console.error);
            }

            // Email aux admins/agents
            if (staffUsers && staffUsers.length > 0) {
                const { data: staffWithEmail } = await supabaseAdmin
                    .from("users")
                    .select("contact_email, email")
                    .in("id", staffUsers.map((s: { id: string }) => s.id));

                const staffEmails = (staffWithEmail ?? [])
                    .map((u: { contact_email?: string; email?: string }) => u.contact_email || u.email)
                    .filter(Boolean) as string[];

                if (staffEmails.length > 0) {
                    sendPaymentDeclarationEmail({
                        studentName,
                        paymentType: type,
                        tranche: tranche_num,
                        amount: montant_declare,
                        staffEmails,
                    }).catch(console.error);
                }
            }
        }

        return NextResponse.json({ success: true });
    } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : "Erreur serveur";
        return NextResponse.json({ error: msg }, { status: 500 });
    }
}
