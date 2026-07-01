import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";
import { getServerSession } from "@/app/lib/auth";

const bodySchema = z.object({
    payment_id: z.string().uuid(),
});

const STAFF_ROLES = ["admin", "super_admin", "agent", "supervisor"];

const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/**
 * Annule une déclaration de paiement en attente de validation.
 * - Étudiant : peut annuler UNIQUEMENT sa propre déclaration.
 * - Staff (admin/super_admin/agent/supervisor) : peut annuler n'importe quelle déclaration.
 * L'annulation ramène le paiement à l'état « attente » (pré-déclaration) sans
 * écriture comptable — contrairement au rejet, c'est un retrait neutre.
 */
export async function POST(req: NextRequest) {
    try {
        const session = await getServerSession(req);
        if (!session) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
        const user = session.user;
        const isStaff = STAFF_ROLES.includes(user.role);

        const parsed = bodySchema.safeParse(await req.json());
        if (!parsed.success) {
            return NextResponse.json({ error: "Paramètres invalides" }, { status: 400 });
        }
        const { payment_id } = parsed.data;

        const { data: payment } = await supabaseAdmin
            .from("payments")
            .select("id, student_id, status, type, tranche")
            .eq("id", payment_id)
            .single();

        if (!payment) return NextResponse.json({ error: "Paiement introuvable" }, { status: 404 });
        if (payment.status !== "en_validation") {
            return NextResponse.json({ error: "Aucune déclaration à annuler pour ce paiement" }, { status: 400 });
        }

        // Étudiant : la déclaration doit lui appartenir.
        if (!isStaff) {
            const { data: student } = await supabaseAdmin
                .from("students")
                .select("id")
                .eq("id", payment.student_id)
                .or(`created_by.eq.${user.id},user_id.eq.${user.id}`)
                .maybeSingle();
            if (!student) return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
        }

        const { error: updateError } = await supabaseAdmin
            .from("payments")
            .update({
                status: "attente",
                montant_declare: 0,
                initiated_by_student: false,
                rejection_reason: null,
                rejected_at: null,
            })
            .eq("id", payment_id);

        if (updateError) {
            console.error("[cancel-payment-declaration] update error:", updateError.message);
            return NextResponse.json({ error: "Impossible d'annuler la déclaration" }, { status: 500 });
        }

        // Notification (best-effort).
        try {
            if (isStaff) {
                // Prévenir l'étudiant que sa déclaration a été annulée par le staff.
                const { data: student } = await supabaseAdmin
                    .from("students")
                    .select("user_id, created_by")
                    .eq("id", payment.student_id)
                    .maybeSingle();
                const studentUserId = student?.user_id ?? student?.created_by ?? null;
                if (studentUserId) {
                    await supabaseAdmin.from("notifications").insert({
                        user_id: studentUserId,
                        type: "mise_a_jour_dossier",
                        titre: "Déclaration de paiement annulée",
                        message: "Votre déclaration de paiement a été annulée. Vous pouvez la soumettre à nouveau.",
                        read: false,
                        metadata: { payment_id, student_id: payment.student_id },
                    });
                }
            } else {
                // Prévenir le staff qu'un étudiant a retiré sa déclaration.
                const { data: staffUsers } = await supabaseAdmin
                    .from("users")
                    .select("id")
                    .in("role", STAFF_ROLES);
                const { data: studentUser } = await supabaseAdmin
                    .from("users").select("name").eq("id", user.id).maybeSingle();
                const studentName = studentUser?.name ?? "Un étudiant";
                if (staffUsers && staffUsers.length > 0) {
                    await supabaseAdmin.from("notifications").insert(
                        staffUsers.map((staff: { id: string }) => ({
                            user_id: staff.id,
                            type: "mise_a_jour_dossier",
                            titre: "Déclaration de paiement annulée",
                            message: `${studentName} a annulé sa déclaration de paiement.`,
                            read: false,
                            metadata: { payment_id, student_id: payment.student_id },
                        }))
                    );
                }
            }
        } catch (notifErr) {
            console.error("[cancel-payment-declaration] notification error:", notifErr);
        }

        return NextResponse.json({ success: true });
    } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : "Erreur serveur";
        return NextResponse.json({ error: msg }, { status: 500 });
    }
}
