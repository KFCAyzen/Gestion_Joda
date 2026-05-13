import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { requireAuth, AuthSession } from "@/app/lib/auth";
import { sendStudentMessageEmail, getLang } from "@/app/lib/emailService";
import { sendSmsToPhone } from "@/app/lib/smsService";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function handleSendStudentMessage(req: NextRequest, session: AuthSession) {
  try {
    const { studentIds, subject, content } = await req.json();

    if (!Array.isArray(studentIds) || studentIds.length === 0) {
      return NextResponse.json({ error: "studentIds manquant" }, { status: 400 });
    }
    if (!subject || !content) {
      return NextResponse.json({ error: "subject/content manquant" }, { status: 400 });
    }

    const role = session.user.role;
    if (!["agent", "admin", "super_admin"].includes(role)) {
      return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
    }

    const { data: students, error: studentsErr } = await supabaseAdmin
      .from("students")
      .select("id, user_id, nom, prenom, email, telephone, langue")
      .in("id", studentIds);

    if (studentsErr) {
      return NextResponse.json({ error: studentsErr.message }, { status: 500 });
    }

    const recipients = (students ?? []).filter((s) => !!s.user_id);
    if (recipients.length === 0) {
      return NextResponse.json({ error: "Aucun destinataire valide (pas de compte lié)" }, { status: 400 });
    }

    const messages = recipients.map((s) => ({
      from_user_id: session.user.id,
      to_user_id: s.user_id,
      subject,
      content,
      read: false,
      metadata: {
        student_id: s.id,
        student_name: `${s.prenom ?? ""} ${s.nom ?? ""}`.trim(),
      },
    }));

    const { data: inserted, error: insertErr } = await supabaseAdmin
      .from("messages")
      .insert(messages)
      .select("id, to_user_id");

    if (insertErr) {
      return NextResponse.json({ error: insertErr.message }, { status: 500 });
    }

    // Also create a notification for recipients (so it appears in the student portal).
    const notifications = (inserted ?? []).map((m) => ({
      user_id: m.to_user_id,
      type: "mise_a_jour_dossier",
      titre: "Message",
      message: subject,
      read: false,
      metadata: { message_id: m.id },
    }));

    const { error: notifErr } = await supabaseAdmin.from("notifications").insert(notifications);
    if (notifErr) {
      // Message was stored; notification is best-effort.
      console.error("[send-student-message] notification error:", notifErr.message);
    }

    // Email + SMS aux étudiants pour les notifier du nouveau message
    for (const s of recipients) {
      const studentName = `${s.prenom ?? ""} ${s.nom ?? ""}`.trim();
      const studentAny = s as typeof s & { email?: string; telephone?: string; langue?: string };
      const lang = getLang(studentAny.langue);
      const isEn = lang === "en";

      if (studentAny.email) {
        sendStudentMessageEmail({
          studentName,
          studentEmail: studentAny.email,
          subject,
          preview: (content as string).slice(0, 120),
          lang,
        }).catch(console.error);
      }

      if (studentAny.telephone) {
        const smsText = isEn
          ? `Hello ${studentName}, you have received a message from the JODA team: "${subject}". Log in at gestion-joda.vercel.app to read it.`
          : `Bonjour ${studentName}, vous avez reçu un message de l'équipe JODA : "${subject}". Connectez-vous sur gestion-joda.vercel.app pour lire le message.`;
        sendSmsToPhone(studentAny.telephone, smsText).catch(console.error);
      }
    }

    return NextResponse.json({ success: true, sent: recipients.length });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || "Erreur serveur" }, { status: 500 });
  }
}

export const POST = requireAuth(handleSendStudentMessage);

