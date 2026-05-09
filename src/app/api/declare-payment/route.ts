import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { requireAuth, AuthSession } from "@/app/lib/auth";

const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function handleDeclarePayment(req: NextRequest, session: AuthSession) {
    try {
        if (session.user.role !== "student") {
            return NextResponse.json({ error: "Réservé aux étudiants" }, { status: 403 });
        }

        const { payment_id, proof_url } = await req.json();
        if (!payment_id) {
            return NextResponse.json({ error: "payment_id requis" }, { status: 400 });
        }

        // Resolve the student record linked to this auth user
        const { data: student } = await supabaseAdmin
            .from("students")
            .select("id")
            .eq("created_by", session.user.id)
            .single();

        if (!student) {
            return NextResponse.json({ error: "Aucun dossier étudiant trouvé" }, { status: 404 });
        }

        // Verify the payment belongs to this student and is in a declarable state
        const { data: payment } = await supabaseAdmin
            .from("payments")
            .select("id, status, student_id, type, tranche, montant")
            .eq("id", payment_id)
            .eq("student_id", student.id)
            .single();

        if (!payment) {
            return NextResponse.json({ error: "Paiement introuvable" }, { status: 404 });
        }

        if (payment.status !== "attente" && payment.status !== "retard") {
            return NextResponse.json({ error: "Ce paiement ne peut pas être déclaré dans son état actuel" }, { status: 400 });
        }

        // Mark payment as pending staff validation
        const updates: Record<string, unknown> = {
            status: "en_validation",
            initiated_by_student: true,
        };
        if (proof_url) updates.facture_url = proof_url;

        const { error: updateError } = await supabaseAdmin
            .from("payments")
            .update(updates)
            .eq("id", payment_id);

        if (updateError) {
            return NextResponse.json({ error: updateError.message }, { status: 500 });
        }

        // Notify all staff
        const { data: staffUsers } = await supabaseAdmin
            .from("users")
            .select("id")
            .in("role", ["admin", "super_admin", "agent", "supervisor"]);

        if (staffUsers && staffUsers.length > 0) {
            const { data: studentUser } = await supabaseAdmin
                .from("users")
                .select("name")
                .eq("id", session.user.id)
                .single();

            const studentName = studentUser?.name ?? "Un étudiant";
            const typeLabel = payment.type === "bourse"
                ? "Bourse"
                : payment.type === "mandarin"
                    ? "Cours Mandarin"
                    : "Cours Anglais";

            const notifications = staffUsers.map((staff) => ({
                user_id: staff.id,
                type: "paiement_valide",
                titre: "Déclaration de paiement",
                message: `${studentName} a déclaré un paiement pour ${typeLabel}${payment.tranche ? ` (tranche ${payment.tranche})` : ""} — ${payment.montant.toLocaleString("fr-FR")} FCFA. En attente de validation.`,
                read: false,
                metadata: { payment_id: payment_id, student_id: student.id },
            }));

            await supabaseAdmin.from("notifications").insert(notifications);
        }

        return NextResponse.json({ success: true });
    } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : "Erreur serveur";
        return NextResponse.json({ error: msg }, { status: 500 });
    }
}

export const POST = requireAuth(handleDeclarePayment);
