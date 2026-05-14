import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getServerSession } from "@/app/lib/auth";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ studentId: string }> }
) {
  const session = await getServerSession(req);
  if (!session) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

  const { role } = session.user;
  if (!["agent", "admin", "super_admin"].includes(role)) {
    return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
  }

  const { studentId } = await context.params;

  const { data: student, error: sErr } = await supabaseAdmin
    .from("students")
    .select("user_id")
    .eq("id", studentId)
    .single();

  if (sErr || !student) return NextResponse.json({ error: "Introuvable" }, { status: 404 });
  if (!student.user_id) return NextResponse.json({ messages: [] });

  const { data, error: mErr } = await supabaseAdmin
    .from("messages")
    .select("id, from_user_id, to_user_id, subject, content, read, created_at")
    .or(`from_user_id.eq.${student.user_id},to_user_id.eq.${student.user_id}`)
    .order("created_at", { ascending: true });

  if (mErr) return NextResponse.json({ error: mErr.message }, { status: 500 });

  return NextResponse.json({ messages: data ?? [] });
}
