import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { requireRole } from '@/app/lib/auth';
import { sendNewsletterEmail, getLang } from '@/app/lib/emailService';
import type { AuthSession } from '@/app/lib/auth';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

type NewsletterFilter =
  | 'all'
  | 'dossier_attente'
  | 'dossier_cours'
  | 'payment_late'
  | 'langue_mandarin'
  | 'langue_anglais'
  | 'choix_bourse'
  | 'choix_cours';

async function getRecipients(filter: NewsletterFilter) {
  let studentIds: string[] | null = null;

  if (filter === 'dossier_attente') {
    const { data } = await supabaseAdmin
      .from('dossier_bourses')
      .select('student_id')
      .eq('status', 'en_attente');
    studentIds = data?.map((d: any) => d.student_id) ?? [];
  } else if (filter === 'dossier_cours') {
    const { data } = await supabaseAdmin
      .from('dossier_bourses')
      .select('student_id')
      .eq('status', 'en_cours');
    studentIds = data?.map((d: any) => d.student_id) ?? [];
  } else if (filter === 'payment_late') {
    const { data } = await supabaseAdmin
      .from('payments')
      .select('student_id')
      .eq('status', 'retard');
    studentIds = [...new Set(data?.map((d: any) => d.student_id) ?? [])];
  }

  if (studentIds !== null && studentIds.length === 0) return [];

  let studentQuery = supabaseAdmin
    .from('students')
    .select('id, nom, prenom, langue, choix, user_id');

  if (filter === 'langue_mandarin') {
    studentQuery = studentQuery.ilike('langue', '%mandarin%');
  } else if (filter === 'langue_anglais') {
    studentQuery = studentQuery.ilike('langue', '%anglais%');
  } else if (filter === 'choix_bourse') {
    studentQuery = studentQuery.in('choix', ['procedure_seule', 'procedure_cours']);
  } else if (filter === 'choix_cours') {
    studentQuery = studentQuery.in('choix', ['cours_seuls', 'procedure_cours']);
  }

  if (studentIds !== null) {
    studentQuery = studentQuery.in('id', studentIds);
  }

  const { data: students } = await studentQuery;
  if (!students || students.length === 0) return [];

  const userIds = students.map((s: any) => s.user_id).filter(Boolean);
  if (userIds.length === 0) return [];

  const { data: users } = await supabaseAdmin
    .from('users')
    .select('id, contact_email')
    .in('id', userIds);

  const emailMap = new Map(users?.map((u: any) => [u.id, u.contact_email]) ?? []);

  return students
    .map((s: any) => ({
      id: s.id,
      name: `${s.prenom} ${s.nom}`,
      email: emailMap.get(s.user_id) as string | null,
      langue: s.langue,
    }))
    .filter((s: any) => s.email);
}

async function handler(req: NextRequest, _session: AuthSession) {
  const body = await req.json();
  const { subject, message, filter = 'all', dryRun = false } = body;

  if (!dryRun && (!subject?.trim() || !message?.trim())) {
    return NextResponse.json({ error: 'Objet et message requis' }, { status: 400 });
  }

  const recipients = await getRecipients(filter as NewsletterFilter);

  if (dryRun) {
    return NextResponse.json({
      count: recipients.length,
      sample: recipients.slice(0, 5).map((r) => r.email),
    });
  }

  let sent = 0;
  let errors = 0;

  for (const recipient of recipients) {
    if (!recipient.email) continue;
    const lang = getLang(recipient.langue);
    const ok = await sendNewsletterEmail({
      studentName: recipient.name,
      studentEmail: recipient.email,
      subject,
      message,
      lang,
    });
    if (ok) sent++;
    else errors++;
  }

  return NextResponse.json({ success: true, total: recipients.length, sent, errors });
}

export const POST = requireRole(['agent', 'supervisor', 'admin', 'super_admin'], handler);
