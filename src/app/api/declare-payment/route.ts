import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

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
            .select("id")
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
                const { data: created, error: createErr } = await supabaseAdmin
                    .from("payments")
                    .insert({
                        student_id: student.id,
                        type,
                        tranche: tranche_num,
                        montant: montant_tranche ?? montant_declare,
                        status: "attente",
                        penalites: 0,
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

        return NextResponse.json({ success: true });
    } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : "Erreur serveur";
        return NextResponse.json({ error: msg }, { status: 500 });
    }
}
