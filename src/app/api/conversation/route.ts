import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getServerSession } from "@/app/lib/auth";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(req: NextRequest) {
  const session = await getServerSession(req);
  if (!session) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

  const { role, id: agentId } = session.user;
  if (!["agent", "admin", "super_admin"].includes(role)) {
    return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
  }

  const { data: students, error: sErr } = await supabaseAdmin
    .from("students")
    .select("id, nom, prenom, email, user_id")
    .not("user_id", "is", null)
    .order("nom", { ascending: true });

  if (sErr) return NextResponse.json({ error: sErr.message }, { status: 500 });
  if (!students || students.length === 0) return NextResponse.json({ conversations: [] });

  const userIds = students.map((s) => s.user_id as string);

  const { data: msgs, error: mErr } = await supabaseAdmin
    .from("messages")
    .select("id, from_user_id, to_user_id, content, read, created_at")
    .or(`from_user_id.in.(${userIds.join(",")}),to_user_id.in.(${userIds.join(",")})`)
    .order("created_at", { ascending: false });

  if (mErr) return NextResponse.json({ error: mErr.message }, { status: 500 });

  const msgList = (msgs ?? []) as {
    id: string; from_user_id: string; to_user_id: string;
    content: string; read: boolean; created_at: string;
  }[];

  const conversations = students.map((s) => {
    const studentMsgs = msgList.filter(
      (m) => m.from_user_id === s.user_id || m.to_user_id === s.user_id
    );
    const last = studentMsgs[0];
    const unread = studentMsgs.filter(
      (m) => m.to_user_id === agentId && !m.read && m.from_user_id === s.user_id
    ).length;
    return {
      id: s.id,
      nom: s.nom,
      prenom: s.prenom,
      email: s.email,
      user_id: s.user_id,
      lastMessage: last?.content ?? null,
      lastAt: last?.created_at ?? null,
      unread,
    };
  });

  conversations.sort((a, b) => {
    if (!a.lastAt && !b.lastAt) return 0;
    if (!a.lastAt) return 1;
    if (!b.lastAt) return -1;
    return new Date(b.lastAt).getTime() - new Date(a.lastAt).getTime();
  });

  return NextResponse.json({ conversations });
}
