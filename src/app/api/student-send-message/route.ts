import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { requireAuth, AuthSession } from "@/app/lib/auth";
import { getFaqById } from "@/app/lib/faq-data";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function handler(req: NextRequest, session: AuthSession) {
  const { subject, content, faq_id, locale } = await req.json();

  if (!subject?.trim() || !content?.trim()) {
    return NextResponse.json({ error: "subject/content manquant" }, { status: 400 });
  }

  // Only students can use this route
  if (session.user.role !== "student") {
    return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
  }

  // Find all admins/agents to notify
  const { data: staff } = await supabaseAdmin
    .from("users")
    .select("id")
    .in("role", ["admin", "super_admin", "agent"]);

  const recipients = staff ?? [];
  if (recipients.length === 0) {
    return NextResponse.json({ error: "Aucun destinataire disponible" }, { status: 400 });
  }

  const messages = recipients.map((u) => ({
    from_user_id: session.user.id,
    to_user_id: u.id,
    subject: subject.trim(),
    content: content.trim(),
    read: false,
    metadata: { from_student_id: session.user.id, faq_id: faq_id ?? null },
  }));

  const { error } = await supabaseAdmin.from("messages").insert(messages);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Réponse automatique : ciblée si FAQ, générique sinon
  const isFR = !locale || locale === "fr";
  const faqItem = faq_id ? getFaqById(faq_id) : undefined;

  const autoReplySubject = faqItem
    ? (isFR ? "Réponse à votre question" : "Answer to your question")
    : (isFR ? "Confirmation de réception" : "Message received");

  const autoReplyContent = faqItem
    ? (isFR ? faqItem.answerFR : faqItem.answerEN)
    : (isFR
        ? "Merci pour votre message. Votre agent Joda traitera votre demande sous peu. Vous serez contacté(e) dans les meilleurs délais."
        : "Thank you for your message. Your Joda agent will process your request shortly. You will be contacted as soon as possible.");

  await supabaseAdmin.from("messages").insert({
    from_user_id: recipients[0].id,
    to_user_id: session.user.id,
    subject: autoReplySubject,
    content: autoReplyContent,
    read: false,
    metadata: { is_auto_reply: true, faq_id: faq_id ?? null },
  });

  return NextResponse.json({ success: true });
}

export const POST = requireAuth(handler);
