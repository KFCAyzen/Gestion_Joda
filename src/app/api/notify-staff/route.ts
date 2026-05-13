import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { requireAuth, AuthSession } from "@/app/lib/auth";
import { sendDocumentSubmissionEmail } from "@/app/lib/emailService";

const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function handleNotifyStaff(req: NextRequest, session: AuthSession) {
    try {
        const { studentId } = await req.json();
        if (!studentId) {
            return NextResponse.json({ error: "studentId manquant" }, { status: 400 });
        }

        const { data: studentUser } = await supabaseAdmin
            .from("users")
            .select("name")
            .eq("id", session.user.id)
            .single();

        const studentName = studentUser?.name || "Un étudiant";

        const { data: staffUsers, error: staffError } = await supabaseAdmin
            .from("users")
            .select("id")
            .in("role", ["admin", "super_admin", "agent", "supervisor"]);

        if (staffError) {
            return NextResponse.json({ error: staffError.message }, { status: 500 });
        }

        if (!staffUsers || staffUsers.length === 0) {
            return NextResponse.json({ success: true, sent: 0 });
        }

        const notifications = staffUsers.map((staff) => ({
            user_id: staff.id,
            type: "mise_a_jour_dossier",
            titre: "Documents soumis",
            message: `${studentName} a soumis ses documents pour examen. Merci de vérifier son dossier.`,
            read: false,
            metadata: { student_id: studentId },
        }));

        const { error: insertError } = await supabaseAdmin
            .from("notifications")
            .insert(notifications);

        if (insertError) {
            return NextResponse.json({ error: insertError.message }, { status: 500 });
        }

        // Envoyer email aux staff
        const { data: staffWithEmail } = await supabaseAdmin
            .from("users")
            .select("contact_email, email")
            .in("id", staffUsers.map((s: { id: string }) => s.id));

        const staffEmails = (staffWithEmail ?? [])
            .map((u: { contact_email?: string; email?: string }) => u.contact_email || u.email)
            .filter(Boolean) as string[];

        if (staffEmails.length > 0) {
            sendDocumentSubmissionEmail({ studentName, staffEmails }).catch(console.error);
        }

        return NextResponse.json({ success: true, sent: staffUsers.length });
    } catch (err: any) {
        return NextResponse.json({ error: err?.message || "Erreur serveur" }, { status: 500 });
    }
}

export const POST = requireAuth(handleNotifyStaff);
