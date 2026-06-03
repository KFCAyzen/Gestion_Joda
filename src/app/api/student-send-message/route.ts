import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { requireAuth, AuthSession } from "@/app/lib/auth";
import { getFaqById, matchAutoReply } from "@/app/lib/faq-data";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function handler(req: NextRequest, session: AuthSession) {
  const { subject, content, faq_id, locale, agent_user_id } = await req.json();

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

  const allStaff = staff ?? [];
  if (allStaff.length === 0) {
    return NextResponse.json({ error: "Aucun destinataire disponible" }, { status: 400 });
  }

  // Conversation entamée : on cible l'agent actif s'il fait partie du staff.
  // Premier contact / FAQ : on diffuse à tout le staff pour prise en charge.
  const targetedAgent = agent_user_id && allStaff.some((u) => u.id === agent_user_id)
    ? agent_user_id
    : null;
  const recipients = targetedAgent ? [{ id: targetedAgent }] : allStaff;

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

  // Réponse automatique : ciblée si FAQ (bouton), détectée sur message libre, générique sinon
  const isFR = !locale || locale === "fr";
  const faqItem = faq_id ? getFaqById(faq_id) : undefined;
  // Message libre : on tente de reconnaître une question basique/récurrente
  const detected = faqItem ? null : matchAutoReply(content);

  let autoReplySubject: string;
  let autoReplyContent: string;
  let matchedFaqId: string | null = faq_id ?? null;

  if (faqItem) {
    autoReplySubject = isFR ? "Réponse à votre question" : "Answer to your question";
    autoReplyContent = isFR ? faqItem.answerFR : faqItem.answerEN;
  } else if (detected) {
    autoReplySubject = isFR ? detected.subjectFR : detected.subjectEN;
    autoReplyContent = isFR ? detected.answerFR : detected.answerEN;
    if (detected.source === "faq") matchedFaqId = detected.matchedId;
  } else {
    autoReplySubject = isFR ? "Confirmation de réception" : "Message received";
    autoReplyContent = isFR
      ? "Merci pour votre message. Votre agent Joda traitera votre demande sous peu. Vous serez contacté(e) dans les meilleurs délais."
      : "Thank you for your message. Your Joda agent will process your request shortly. You will be contacted as soon as possible.";
  }

  await supabaseAdmin.from("messages").insert({
    from_user_id: recipients[0].id,
    to_user_id: session.user.id,
    subject: autoReplySubject,
    content: autoReplyContent,
    read: false,
    metadata: { is_auto_reply: true, faq_id: matchedFaqId },
  });

  return NextResponse.json({ success: true });
}

export const POST = requireAuth(handler);
