import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { sendDossierInactiveEmail, getLang } from '@/app/lib/emailService';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const INACTIVITY_DAYS = parseInt(process.env.NEWSLETTER_INACTIVITY_DAYS ?? '14', 10);

function verifyApiKey(req: NextRequest): boolean {
  return req.headers.get('x-api-key') === process.env.CRON_SECRET;
}

export async function GET(req: NextRequest) {
  if (!verifyApiKey(req)) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
  }

  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - INACTIVITY_DAYS);

  const { data: dossiers, error } = await supabaseAdmin
    .from('dossier_bourses')
    .select('student_id, status, updated_at')
    .in('status', ['en_attente', 'en_cours', 'document_manquant'])
    .lt('updated_at', cutoffDate.toISOString());

  if (error) {
    console.error('[Cron newsletter-auto] Erreur dossiers:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (!dossiers || dossiers.length === 0) {
    return NextResponse.json({ message: 'Aucun dossier inactif', sent: 0 });
  }

  const studentIds = [...new Set(dossiers.map((d: any) => d.student_id))];

  const { data: students } = await supabaseAdmin
    .from('students')
    .select('id, nom, prenom, langue, user_id')
    .in('id', studentIds);

  if (!students || students.length === 0) {
    return NextResponse.json({ message: 'Aucun étudiant trouvé', sent: 0 });
  }

  const userIds = students.map((s: any) => s.user_id).filter(Boolean);
  const { data: users } = await supabaseAdmin
    .from('users')
    .select('id, contact_email')
    .in('id', userIds);

  const emailMap = new Map(users?.map((u: any) => [u.id, u.contact_email]) ?? []);
  const dossierMap = new Map(dossiers.map((d: any) => [d.student_id, d]));

  let sent = 0;
  let errors = 0;

  for (const student of students) {
    const email = emailMap.get((student as any).user_id);
    if (!email) continue;

    const dossier = dossierMap.get((student as any).id);
    if (!dossier) continue;

    const inactiveDays = Math.floor(
      (Date.now() - new Date((dossier as any).updated_at).getTime()) / (1000 * 60 * 60 * 24)
    );

    const lang = getLang((student as any).langue);
    const ok = await sendDossierInactiveEmail({
      studentName: `${(student as any).prenom} ${(student as any).nom}`,
      studentEmail: email as string,
      dossierStatus: (dossier as any).status,
      inactiveDays,
      lang,
    });

    if (ok) sent++;
    else errors++;
  }

  console.log(`[Cron newsletter-auto] ${sent} relances envoyées, ${errors} erreurs`);
  return NextResponse.json({
    message: 'Automatisation terminée',
    total: students.length,
    sent,
    errors,
    timestamp: new Date().toISOString(),
  });
}
