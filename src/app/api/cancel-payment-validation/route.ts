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
 * Annule une validation de paiement déjà effectuée.
 *  1. Supprime la (les) écriture(s) comptable(s) liée(s) au paiement — le trigger
 *     DELETE sur entrees_comptables réajuste le cache de solde de trésorerie.
 *  2. Réinitialise le paiement à l'état « en attente » (pré-validation) :
 *     montant_paye/déclaré/pénalités remis à 0, horodatages de validation effacés.
 * Réservé au staff (admin/super_admin/agent/supervisor). Opération irréversible.
 */
export async function POST(req: NextRequest) {
    try {
        const session = await getServerSession(req);
        if (!session) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
        const user = session.user;
        if (!STAFF_ROLES.includes(user.role)) {
            return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
        }

        const parsed = bodySchema.safeParse(await req.json());
        if (!parsed.success) {
            return NextResponse.json({ error: "Paramètres invalides" }, { status: 400 });
        }
        const { payment_id } = parsed.data;

        const { data: payment } = await supabaseAdmin
            .from("payments")
            .select("id, student_id, status, type, tranche, montant, montant_paye")
            .eq("id", payment_id)
            .single();

        if (!payment) return NextResponse.json({ error: "Paiement introuvable" }, { status: 404 });

        const wasValidated = payment.status === "paye" || Number(payment.montant_paye ?? 0) > 0;
        if (!wasValidated) {
            return NextResponse.json({ error: "Ce paiement n'a pas été validé" }, { status: 400 });
        }

        // 1. Suppression des écritures comptables issues de la validation.
        const { data: deleted, error: delErr } = await supabaseAdmin
            .from("entrees_comptables")
            .delete()
            .eq("payment_id", payment_id)
            .select("id");
        if (delErr) {
            console.error("[cancel-payment-validation] delete entrees error:", delErr.message);
            return NextResponse.json({ error: "Impossible de supprimer l'écriture comptable" }, { status: 500 });
        }

        // 2. Retour à l'état pré-validation.
        const { error: updErr } = await supabaseAdmin
            .from("payments")
            .update({
                status: "attente",
                montant_paye: 0,
                montant_declare: 0,
                penalites: 0,
                validated_by: null,
                validated_at: null,
                date_paiement: null,
                rejection_reason: null,
                rejected_at: null,
            })
            .eq("id", payment_id);
        if (updErr) {
            console.error("[cancel-payment-validation] update payment error:", updErr.message);
            return NextResponse.json(
                { error: "Écritures supprimées mais réinitialisation du paiement échouée" },
                { status: 500 }
            );
        }

        // 3. Notification étudiant (best-effort).
        try {
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
                    titre: "Validation de paiement annulée",
                    message: "La validation de votre paiement a été annulée. Le paiement est de nouveau en attente.",
                    read: false,
                    metadata: { payment_id, student_id: payment.student_id },
                });
            }
        } catch (notifErr) {
            console.error("[cancel-payment-validation] notification error:", notifErr);
        }

        return NextResponse.json({ success: true, deletedEntries: deleted?.length ?? 0 });
    } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : "Erreur serveur";
        return NextResponse.json({ error: msg }, { status: 500 });
    }
}
