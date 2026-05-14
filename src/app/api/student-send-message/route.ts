import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { requireAuth, AuthSession } from "@/app/lib/auth";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function handler(req: NextRequest, session: AuthSession) {
  const { subject, content } = await req.json();

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
    metadata: { from_student_id: session.user.id },
  }));

  const { error } = await supabaseAdmin.from("messages").insert(messages);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ success: true });
}

export const POST = requireAuth(handler);
