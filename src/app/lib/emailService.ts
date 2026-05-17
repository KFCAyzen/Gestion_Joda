import { Resend } from 'resend';

const FROM_EMAIL = 'Joda Company <contact@portal-joda.company>';

function getResend() {
  return new Resend(process.env.RESEND_API_KEY);
}

// ── Language helpers ───────────────────────────────────────────────────────────

export type Lang = 'fr' | 'en';

export function getLang(langue?: string | null): Lang {
  return langue?.toLowerCase().includes('anglais') ? 'en' : 'fr';
}

// ── Shared HTML helpers ────────────────────────────────────────────────────────

function emailHeader(lang: Lang = 'fr') {
  const subtitle = lang === 'en'
    ? 'China Scholarship Management'
    : "Gestion des bourses d'études en Chine";
  return `
    <tr>
      <td style="background:linear-gradient(135deg,#dc2626,#b91c1c);padding:32px 40px;text-align:center;">
        <h1 style="margin:0;color:#ffffff;font-size:24px;font-weight:700;">Joda Company</h1>
        <p style="margin:6px 0 0;color:rgba(255,255,255,0.85);font-size:13px;">${subtitle}</p>
      </td>
    </tr>`;
}

function emailFooter(year: number, lang: Lang = 'fr') {
  const rights = lang === 'en' ? 'All rights reserved' : 'Tous droits réservés';
  return `
    <tr>
      <td style="background:#f9fafb;border-top:1px solid #e5e7eb;padding:20px 40px;text-align:center;">
        <p style="margin:0;font-size:12px;color:#9ca3af;">© ${year} Joda Company — ${rights}</p>
      </td>
    </tr>`;
}

const PAYMENT_TYPE_LABELS_BILINGUAL: Record<string, Record<Lang, string>> = {
  bourse:   { fr: 'Procédure Bourse',   en: 'Scholarship Procedure' },
  mandarin: { fr: 'Cours de Mandarin',  en: 'Mandarin Course' },
  anglais:  { fr: "Cours d'Anglais",    en: 'English Course' },
};

function paymentTypeLabel(type: string, lang: Lang): string {
  return PAYMENT_TYPE_LABELS_BILINGUAL[type]?.[lang] ?? type;
}

function formatCFA(amount: number) {
  return new Intl.NumberFormat('fr-FR').format(amount) + ' FCFA';
}

// ── Payment reminder → student ─────────────────────────────────────────────────

interface PaymentReminderData {
  studentName: string;
  studentEmail: string;
  paymentType: 'bourse' | 'mandarin' | 'anglais';
  tranche: number;
  amount: number;
  dueDate: string;
  daysLate: number;
  penalties: number;
  lang?: Lang;
}

export async function sendPaymentReminder(data: PaymentReminderData): Promise<boolean> {
  const lang = data.lang ?? 'fr';
  const isEn = lang === 'en';

  const bourseTrancheLabels: Record<number, string> = isEn
    ? { 1: 'File Opening', 2: 'Deposit', 3: 'Visa' }
    : { 1: 'Ouverture de dossier', 2: 'Caution', 3: 'Visa' };

  const typeName = paymentTypeLabel(data.paymentType, lang);

  const formatDate = (date: string) =>
    new Date(date).toLocaleDateString(isEn ? 'en-GB' : 'fr-FR', {
      day: '2-digit', month: 'long', year: 'numeric',
    });

  const urgencyLevel = isEn
    ? (data.daysLate <= 3 ? 'moderate' : data.daysLate <= 7 ? 'important' : 'critical')
    : (data.daysLate <= 3 ? 'modérée'  : data.daysLate <= 7 ? 'importante' : 'critique');
  const urgencyColor = data.daysLate <= 3 ? '#f59e0b' : data.daysLate <= 7 ? '#ef4444' : '#dc2626';

  const trancheLabel = data.paymentType === 'bourse' && bourseTrancheLabels[data.tranche]
    ? `${typeName} — ${bourseTrancheLabels[data.tranche]}`
    : `${typeName} — ${isEn ? 'Instalment' : 'Tranche'} ${data.tranche}`;

  const subject = isEn
    ? `⚠️ Payment reminder - ${data.daysLate} day(s) late`
    : `⚠️ Rappel de paiement - ${data.daysLate} jour(s) de retard`;

  const year = new Date().getFullYear();

  try {
    await getResend().emails.send({
      from: FROM_EMAIL,
      to: [data.studentEmail],
      subject,
      html: `
<!DOCTYPE html>
<html lang="${lang}">
<head><meta charset="UTF-8" /></head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f5;padding:40px 0;">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">
        ${emailHeader(lang)}

        <tr>
          <td style="padding:24px 40px;background:${urgencyColor}10;border-bottom:3px solid ${urgencyColor};">
            <div style="text-align:center;">
              <div style="display:inline-block;background:${urgencyColor};color:#ffffff;padding:8px 20px;border-radius:20px;font-size:12px;font-weight:700;text-transform:uppercase;margin-bottom:12px;">
                ⚠️ ${isEn ? `${urgencyLevel} urgency` : `Urgence ${urgencyLevel}`}
              </div>
              <h2 style="margin:0;color:${urgencyColor};font-size:20px;font-weight:700;">
                ${isEn ? `Payment ${data.daysLate} day(s) late` : `Paiement en retard de ${data.daysLate} jour(s)`}
              </h2>
            </div>
          </td>
        </tr>

        <tr>
          <td style="padding:36px 40px;">
            <p style="margin:0 0 8px;font-size:16px;color:#111827;">${isEn ? 'Hello' : 'Bonjour'} <strong>${data.studentName}</strong>,</p>
            <p style="margin:0 0 28px;font-size:14px;color:#6b7280;line-height:1.6;">
              ${isEn
                ? 'We are informing you that a payment is overdue. Here are the details:'
                : 'Nous vous informons qu\'un paiement est en retard. Voici les détails :'}
            </p>

            <table width="100%" cellpadding="0" cellspacing="0" style="background:#f9fafb;border:2px solid ${urgencyColor}40;border-radius:8px;margin-bottom:28px;">
              <tr><td style="padding:20px 24px;">
                <table width="100%" cellpadding="0" cellspacing="0">
                  <tr>
                    <td style="padding:8px 0;font-size:13px;color:#6b7280;width:140px;">${isEn ? 'Payment type' : 'Type de paiement'}</td>
                    <td style="padding:8px 0;font-size:13px;color:#111827;font-weight:600;">${trancheLabel}</td>
                  </tr>
                  <tr>
                    <td style="padding:8px 0;font-size:13px;color:#6b7280;">${isEn ? 'Amount due' : 'Montant dû'}</td>
                    <td style="padding:8px 0;font-size:15px;color:#111827;font-weight:700;">${formatCFA(data.amount)}</td>
                  </tr>
                  <tr>
                    <td style="padding:8px 0;font-size:13px;color:#6b7280;">${isEn ? 'Deadline' : 'Date limite'}</td>
                    <td style="padding:8px 0;font-size:13px;color:#dc2626;font-weight:600;">${formatDate(data.dueDate)}</td>
                  </tr>
                  <tr>
                    <td style="padding:8px 0;font-size:13px;color:#6b7280;">${isEn ? 'Days late' : 'Jours de retard'}</td>
                    <td style="padding:8px 0;">
                      <span style="background:${urgencyColor};color:#ffffff;font-size:13px;font-weight:700;padding:4px 12px;border-radius:20px;">
                        ${data.daysLate} ${isEn ? 'day(s)' : 'jour(s)'}
                      </span>
                    </td>
                  </tr>
                  ${data.penalties > 0 ? `
                  <tr>
                    <td style="padding:8px 0;font-size:13px;color:#6b7280;">${isEn ? 'Late penalties' : 'Pénalités de retard'}</td>
                    <td style="padding:8px 0;font-size:14px;color:#dc2626;font-weight:700;">+ ${formatCFA(data.penalties)}</td>
                  </tr>
                  <tr style="border-top:2px solid #e5e7eb;">
                    <td style="padding:12px 0 8px;font-size:14px;color:#111827;font-weight:700;">${isEn ? 'TOTAL TO PAY' : 'TOTAL À PAYER'}</td>
                    <td style="padding:12px 0 8px;font-size:16px;color:#dc2626;font-weight:700;">${formatCFA(data.amount + data.penalties)}</td>
                  </tr>
                  ` : ''}
                </table>
              </td></tr>
            </table>

            <div style="background:#fef2f2;border-left:4px solid #dc2626;padding:16px 20px;margin-bottom:28px;border-radius:4px;">
              <p style="margin:0;font-size:13px;color:#991b1b;line-height:1.6;">
                ${isEn
                  ? '<strong>⚠️ Action required:</strong> Please regularize your situation as soon as possible to avoid additional penalties and the blocking of your file.'
                  : '<strong>⚠️ Action requise :</strong> Veuillez régulariser votre situation dans les plus brefs délais pour éviter l\'accumulation de pénalités supplémentaires et le blocage de votre dossier.'}
              </p>
            </div>

            <div style="background:#f0fdf4;border:1px solid #bbf7d0;padding:16px 20px;margin-bottom:28px;border-radius:8px;">
              <p style="margin:0 0 8px;font-size:13px;color:#166534;font-weight:600;">
                ${isEn ? '💬 Need help?' : '💬 Besoin d\'aide ?'}
              </p>
              <p style="margin:0;font-size:12px;color:#15803d;line-height:1.6;">
                ${isEn
                  ? 'If you are having difficulties, contact us immediately:<br>📧 Email: contact@joda.app<br>📞 Phone: +237 XXX XXX XXX'
                  : 'Si vous rencontrez des difficultés, contactez-nous immédiatement :<br>📧 Email: contact@joda.app<br>📞 Téléphone: +237 XXX XXX XXX'}
              </p>
            </div>

            <table cellpadding="0" cellspacing="0" style="margin:0 auto;">
              <tr>
                <td style="background:#dc2626;border-radius:8px;">
                  <a href="https://gestion-joda.vercel.app/etudiant"
                     style="display:inline-block;padding:14px 32px;color:#ffffff;font-size:14px;font-weight:600;text-decoration:none;">
                    ${isEn ? 'View my student space →' : 'Voir mon espace étudiant →'}
                  </a>
                </td>
              </tr>
            </table>
          </td>
        </tr>

        <tr>
          <td style="background:#f9fafb;border-top:1px solid #e5e7eb;padding:20px 40px;text-align:center;">
            <p style="margin:0 0 8px;font-size:11px;color:#6b7280;">
              ${isEn
                ? 'This email is an automatic reminder. Please do not reply directly.'
                : 'Cet email est un rappel automatique. Merci de ne pas y répondre directement.'}
            </p>
            <p style="margin:0;font-size:12px;color:#9ca3af;">
              © ${year} Joda Company — ${isEn ? 'All rights reserved' : 'Tous droits réservés'}
            </p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`,
    });

    console.log(`[Email] Rappel envoyé à ${data.studentEmail} (${data.daysLate} jours de retard)`);
    return true;
  } catch (error) {
    console.error('[Email] Erreur envoi rappel:', error);
    return false;
  }
}

// ── Payment result (validated / rejected) → student ───────────────────────────

interface PaymentResultEmailData {
  studentName: string;
  studentEmail: string;
  paymentType: string;
  tranche: number;
  amount: number;
  isValid: boolean;
  rejectionReason?: string;
  lang?: Lang;
}

export async function sendPaymentResultEmail(data: PaymentResultEmailData): Promise<boolean> {
  const lang = data.lang ?? 'fr';
  const isEn = lang === 'en';
  const typeName = paymentTypeLabel(data.paymentType, lang);
  const year = new Date().getFullYear();
  const statusColor = data.isValid ? '#16a34a' : '#dc2626';
  const statusLabel = data.isValid
    ? (isEn ? 'Payment validated' : 'Paiement validé')
    : (isEn ? 'Payment rejected'  : 'Paiement rejeté');
  const statusBg     = data.isValid ? '#f0fdf4' : '#fef2f2';
  const statusBorder = data.isValid ? '#bbf7d0' : '#fecaca';

  try {
    await getResend().emails.send({
      from: FROM_EMAIL,
      to: [data.studentEmail],
      subject: `${data.isValid ? '✅' : '❌'} ${statusLabel} — ${typeName} ${isEn ? 'Instalment' : 'Tranche'} ${data.tranche}`,
      html: `<!DOCTYPE html>
<html lang="${lang}"><head><meta charset="UTF-8"/></head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f5;padding:40px 0;">
<tr><td align="center">
<table width="560" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">
${emailHeader(lang)}
<tr><td style="padding:36px 40px;">
  <p style="margin:0 0 8px;font-size:16px;color:#111827;">${isEn ? 'Hello' : 'Bonjour'} <strong>${data.studentName}</strong>,</p>
  <div style="background:${statusBg};border:1px solid ${statusBorder};border-radius:8px;padding:20px 24px;margin:24px 0;">
    <p style="margin:0 0 12px;font-size:16px;font-weight:700;color:${statusColor};">${statusLabel}</p>
    <table width="100%" cellpadding="0" cellspacing="0">
      <tr>
        <td style="padding:5px 0;font-size:13px;color:#6b7280;width:140px;">${isEn ? 'Type' : 'Type'}</td>
        <td style="padding:5px 0;font-size:13px;color:#111827;font-weight:600;">${typeName}</td>
      </tr>
      <tr>
        <td style="padding:5px 0;font-size:13px;color:#6b7280;">${isEn ? 'Instalment' : 'Tranche'}</td>
        <td style="padding:5px 0;font-size:13px;color:#111827;font-weight:600;">${data.tranche}</td>
      </tr>
      <tr>
        <td style="padding:5px 0;font-size:13px;color:#6b7280;">${isEn ? 'Amount' : 'Montant'}</td>
        <td style="padding:5px 0;font-size:14px;color:#111827;font-weight:700;">${formatCFA(data.amount)}</td>
      </tr>
    </table>
  </div>
  ${data.isValid
    ? `<p style="font-size:14px;color:#6b7280;line-height:1.6;">${isEn
        ? 'Your payment has been validated by the Joda Company team. You can check your student space to track your file.'
        : 'Votre paiement a été validé par l\'équipe Joda Company. Vous pouvez consulter votre espace étudiant pour le suivi de votre dossier.'}</p>`
    : `<p style="font-size:14px;color:#6b7280;line-height:1.6;">${isEn
        ? 'Your payment could not be validated. Please contact your Joda Company advisor for more information or resubmit your proof of payment.'
        : 'Votre paiement n\'a pas pu être validé. Veuillez contacter votre conseiller Joda Company pour plus d\'informations ou soumettre à nouveau votre justificatif.'}</p>
      ${data.rejectionReason ? `
      <div style="background:#fef2f2;border-left:4px solid #dc2626;padding:14px 18px;margin:16px 0;border-radius:4px;">
        <p style="margin:0 0 4px;font-size:12px;font-weight:700;color:#991b1b;text-transform:uppercase;">${isEn ? 'Reason given' : 'Motif indiqué'}</p>
        <p style="margin:0;font-size:13px;color:#7f1d1d;line-height:1.6;">${data.rejectionReason}</p>
      </div>` : ''}`
  }
  <table cellpadding="0" cellspacing="0" style="margin-top:24px;">
    <tr>
      <td style="background:#dc2626;border-radius:8px;">
        <a href="https://gestion-joda.vercel.app" style="display:inline-block;padding:12px 28px;color:#ffffff;font-size:14px;font-weight:600;text-decoration:none;">
          ${isEn ? 'My student space →' : 'Mon espace étudiant →'}
        </a>
      </td>
    </tr>
  </table>
</td></tr>
${emailFooter(year, lang)}
</table>
</td></tr>
</table>
</body></html>`,
    });
    console.log(`[Email] Résultat paiement envoyé à ${data.studentEmail} (${data.isValid ? 'validé' : 'rejeté'})`);
    return true;
  } catch (err) {
    console.error('[Email] Erreur sendPaymentResultEmail:', err);
    return false;
  }
}

// ── Payment declaration → staff ───────────────────────────────────────────────

interface PaymentDeclarationEmailData {
  studentName: string;
  paymentType: string;
  tranche: number;
  amount: number;
  staffEmails: string[];
}

export async function sendPaymentDeclarationEmail(data: PaymentDeclarationEmailData): Promise<boolean> {
  if (data.staffEmails.length === 0) return false;
  const typeLabel = PAYMENT_TYPE_LABELS_BILINGUAL[data.paymentType]?.fr ?? data.paymentType;
  const year = new Date().getFullYear();

  try {
    await getResend().emails.send({
      from: FROM_EMAIL,
      to: data.staffEmails,
      subject: `💳 Nouvelle déclaration de paiement — ${data.studentName}`,
      html: `<!DOCTYPE html>
<html lang="fr"><head><meta charset="UTF-8"/></head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f5;padding:40px 0;">
<tr><td align="center">
<table width="560" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">
${emailHeader()}
<tr><td style="padding:36px 40px;">
  <p style="margin:0 0 20px;font-size:15px;color:#111827;">Un étudiant vient de déclarer un paiement en attente de validation :</p>
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:8px;margin-bottom:24px;">
    <tr><td style="padding:20px 24px;">
      <table width="100%" cellpadding="0" cellspacing="0">
        <tr>
          <td style="padding:6px 0;font-size:13px;color:#6b7280;width:140px;">Étudiant</td>
          <td style="padding:6px 0;font-size:13px;color:#111827;font-weight:600;">${data.studentName}</td>
        </tr>
        <tr>
          <td style="padding:6px 0;font-size:13px;color:#6b7280;">Type</td>
          <td style="padding:6px 0;font-size:13px;color:#111827;font-weight:600;">${typeLabel}</td>
        </tr>
        <tr>
          <td style="padding:6px 0;font-size:13px;color:#6b7280;">Tranche</td>
          <td style="padding:6px 0;font-size:13px;color:#111827;font-weight:600;">${data.tranche}</td>
        </tr>
        <tr>
          <td style="padding:6px 0;font-size:13px;color:#6b7280;">Montant déclaré</td>
          <td style="padding:6px 0;font-size:14px;color:#111827;font-weight:700;">${formatCFA(data.amount)}</td>
        </tr>
      </table>
    </td></tr>
  </table>
  <table cellpadding="0" cellspacing="0">
    <tr>
      <td style="background:#dc2626;border-radius:8px;">
        <a href="https://gestion-joda.vercel.app" style="display:inline-block;padding:12px 28px;color:#ffffff;font-size:14px;font-weight:600;text-decoration:none;">
          Valider le paiement →
        </a>
      </td>
    </tr>
  </table>
</td></tr>
${emailFooter(year)}
</table>
</td></tr>
</table>
</body></html>`,
    });
    console.log(`[Email] Déclaration paiement notifiée à ${data.staffEmails.length} agent(s)`);
    return true;
  } catch (err) {
    console.error('[Email] Erreur sendPaymentDeclarationEmail:', err);
    return false;
  }
}

// ── Document submission → staff ───────────────────────────────────────────────

interface DocumentSubmissionEmailData {
  studentName: string;
  staffEmails: string[];
}

export async function sendDocumentSubmissionEmail(data: DocumentSubmissionEmailData): Promise<boolean> {
  if (data.staffEmails.length === 0) return false;
  const year = new Date().getFullYear();

  try {
    await getResend().emails.send({
      from: FROM_EMAIL,
      to: data.staffEmails,
      subject: `📂 Documents soumis — ${data.studentName}`,
      html: `<!DOCTYPE html>
<html lang="fr"><head><meta charset="UTF-8"/></head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f5;padding:40px 0;">
<tr><td align="center">
<table width="560" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">
${emailHeader()}
<tr><td style="padding:36px 40px;">
  <p style="margin:0 0 20px;font-size:15px;color:#111827;">
    <strong>${data.studentName}</strong> vient de soumettre ses documents pour examen.
  </p>
  <p style="font-size:14px;color:#6b7280;line-height:1.6;">
    Veuillez vous connecter à la plateforme pour vérifier et valider son dossier.
  </p>
  <table cellpadding="0" cellspacing="0" style="margin-top:24px;">
    <tr>
      <td style="background:#dc2626;border-radius:8px;">
        <a href="https://gestion-joda.vercel.app" style="display:inline-block;padding:12px 28px;color:#ffffff;font-size:14px;font-weight:600;text-decoration:none;">
          Voir le dossier →
        </a>
      </td>
    </tr>
  </table>
</td></tr>
${emailFooter(year)}
</table>
</td></tr>
</table>
</body></html>`,
    });
    console.log(`[Email] Soumission docs notifiée à ${data.staffEmails.length} agent(s)`);
    return true;
  } catch (err) {
    console.error('[Email] Erreur sendDocumentSubmissionEmail:', err);
    return false;
  }
}

// ── New message → student ─────────────────────────────────────────────────────

interface StudentMessageEmailData {
  studentName: string;
  studentEmail: string;
  subject: string;
  preview?: string;
  lang?: Lang;
}

export async function sendStudentMessageEmail(data: StudentMessageEmailData): Promise<boolean> {
  const lang = data.lang ?? 'fr';
  const isEn = lang === 'en';
  const year = new Date().getFullYear();

  try {
    await getResend().emails.send({
      from: FROM_EMAIL,
      to: [data.studentEmail],
      subject: `✉️ ${isEn ? 'New message' : 'Nouveau message'} — ${data.subject}`,
      html: `<!DOCTYPE html>
<html lang="${lang}"><head><meta charset="UTF-8"/></head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f5;padding:40px 0;">
<tr><td align="center">
<table width="560" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">
${emailHeader(lang)}
<tr><td style="padding:36px 40px;">
  <p style="margin:0 0 8px;font-size:16px;color:#111827;">${isEn ? 'Hello' : 'Bonjour'} <strong>${data.studentName}</strong>,</p>
  <p style="margin:0 0 24px;font-size:14px;color:#6b7280;line-height:1.6;">
    ${isEn
      ? 'You have received a new message from the Joda Company team:'
      : 'Vous avez reçu un nouveau message de l\'équipe Joda Company :'}
  </p>
  <div style="background:#f9fafb;border-left:4px solid #dc2626;padding:16px 20px;margin-bottom:24px;border-radius:4px;">
    <p style="margin:0 0 6px;font-size:13px;font-weight:700;color:#111827;">${data.subject}</p>
    ${data.preview ? `<p style="margin:0;font-size:13px;color:#6b7280;">${data.preview}</p>` : ''}
  </div>
  <table cellpadding="0" cellspacing="0">
    <tr>
      <td style="background:#dc2626;border-radius:8px;">
        <a href="https://gestion-joda.vercel.app" style="display:inline-block;padding:12px 28px;color:#ffffff;font-size:14px;font-weight:600;text-decoration:none;">
          ${isEn ? 'Read the message →' : 'Lire le message →'}
        </a>
      </td>
    </tr>
  </table>
</td></tr>
${emailFooter(year, lang)}
</table>
</td></tr>
</table>
</body></html>`,
    });
    console.log(`[Email] Notification message envoyée à ${data.studentEmail}`);
    return true;
  } catch (err) {
    console.error('[Email] Erreur sendStudentMessageEmail:', err);
    return false;
  }
}

// ── Welcome ────────────────────────────────────────────────────────────────────

interface WelcomeEmailData {
  name: string;
  email: string;
  username: string;
  password: string;
  role: string;
  lang?: Lang;
}

export async function sendWelcomeEmail(data: WelcomeEmailData): Promise<boolean> {
  const lang = data.lang ?? 'fr';
  const isEn = lang === 'en';

  const roleLabels: Record<string, Record<Lang, string>> = {
    student:     { fr: 'Étudiant',               en: 'Student' },
    agent:       { fr: 'Agent',                  en: 'Agent' },
    admin:       { fr: 'Administrateur',         en: 'Administrator' },
    supervisor:  { fr: 'Superviseur',            en: 'Supervisor' },
    super_admin: { fr: 'Super Administrateur',   en: 'Super Administrator' },
  };

  try {
    await getResend().emails.send({
      from: FROM_EMAIL,
      to: [data.email],
      subject: isEn
        ? 'Welcome to the Joda Company platform'
        : 'Bienvenue sur la plateforme Joda Company',
      html: `
<!DOCTYPE html>
<html lang="${lang}">
<head><meta charset="UTF-8" /></head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f5;padding:40px 0;">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">
        ${emailHeader(lang)}
        <tr>
          <td style="padding:36px 40px;">
            <p style="margin:0 0 8px;font-size:16px;color:#111827;">${isEn ? 'Hello' : 'Bonjour'} <strong>${data.name}</strong>,</p>
            <p style="margin:0 0 28px;font-size:14px;color:#6b7280;line-height:1.6;">
              ${isEn
                ? 'Your account has been created on the Joda Company platform. Here are your login details:'
                : 'Votre compte a été créé sur la plateforme Joda Company. Voici vos informations de connexion :'}
            </p>
            <table width="100%" cellpadding="0" cellspacing="0" style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:8px;margin-bottom:28px;">
              <tr><td style="padding:20px 24px;">
                <table width="100%" cellpadding="0" cellspacing="0">
                  <tr>
                    <td style="padding:6px 0;font-size:13px;color:#6b7280;width:140px;">${isEn ? 'Username' : 'Nom d\'utilisateur'}</td>
                    <td style="padding:6px 0;font-size:13px;color:#111827;font-weight:600;">${data.username}</td>
                  </tr>
                  <tr>
                    <td style="padding:6px 0;font-size:13px;color:#6b7280;">Email</td>
                    <td style="padding:6px 0;font-size:13px;color:#111827;font-weight:600;">${data.email}</td>
                  </tr>
                  <tr>
                    <td style="padding:6px 0;font-size:13px;color:#6b7280;">${isEn ? 'Password' : 'Mot de passe'}</td>
                    <td style="padding:6px 0;">
                      <span style="font-size:13px;color:#111827;font-weight:600;font-family:monospace;background:#fff;border:1px solid #e5e7eb;border-radius:4px;padding:4px 10px;">${data.password}</span>
                    </td>
                  </tr>
                  <tr>
                    <td style="padding:6px 0;font-size:13px;color:#6b7280;">${isEn ? 'Role' : 'Rôle'}</td>
                    <td style="padding:6px 0;">
                      <span style="background:#fef2f2;color:#dc2626;font-size:12px;font-weight:600;padding:2px 10px;border-radius:20px;">${roleLabels[data.role]?.[lang] || data.role}</span>
                    </td>
                  </tr>
                </table>
              </td></tr>
            </table>
            <p style="margin:0 0 24px;font-size:13px;color:#6b7280;line-height:1.6;">
              ${isEn
                ? 'For security reasons, we recommend changing your password upon first login.'
                : 'Pour des raisons de sécurité, nous vous recommandons de changer votre mot de passe dès votre première connexion.'}
            </p>
            <table cellpadding="0" cellspacing="0" style="margin-bottom:28px;">
              <tr>
                <td style="background:#dc2626;border-radius:8px;">
                  <a href="https://gestion-joda.vercel.app"
                     style="display:inline-block;padding:12px 28px;color:#ffffff;font-size:14px;font-weight:600;text-decoration:none;">
                    ${isEn ? 'Sign in →' : 'Se connecter →'}
                  </a>
                </td>
              </tr>
            </table>
          </td>
        </tr>
        ${emailFooter(new Date().getFullYear(), lang)}
      </table>
    </td></tr>
  </table>
</body>
</html>`,
    });

    console.log(`[Email] Bienvenue envoyé à ${data.email}`);
    return true;
  } catch (error) {
    console.error('[Email] Erreur envoi bienvenue:', error);
    return false;
  }
}

// ── Newsletter → student ───────────────────────────────────────────────────────

interface NewsletterEmailData {
  studentName: string;
  studentEmail: string;
  subject: string;
  message: string;
  lang?: Lang;
}

export async function sendNewsletterEmail(data: NewsletterEmailData): Promise<boolean> {
  const lang = data.lang ?? 'fr';
  const isEn = lang === 'en';
  const year = new Date().getFullYear();

  try {
    await getResend().emails.send({
      from: FROM_EMAIL,
      to: [data.studentEmail],
      subject: data.subject,
      html: `<!DOCTYPE html>
<html lang="${lang}"><head><meta charset="UTF-8"/></head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f5;padding:40px 0;">
<tr><td align="center">
<table width="560" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">
${emailHeader(lang)}
<tr><td style="padding:36px 40px;">
  <p style="margin:0 0 8px;font-size:16px;color:#111827;">${isEn ? 'Hello' : 'Bonjour'} <strong>${data.studentName}</strong>,</p>
  <div style="margin:24px 0;font-size:14px;color:#374151;line-height:1.8;">
    ${data.message.replace(/\n/g, '<br>')}
  </div>
  <table cellpadding="0" cellspacing="0" style="margin-top:28px;">
    <tr>
      <td style="background:#dc2626;border-radius:8px;">
        <a href="https://gestion-joda.vercel.app/etudiant"
           style="display:inline-block;padding:12px 28px;color:#ffffff;font-size:14px;font-weight:600;text-decoration:none;">
          ${isEn ? 'My student space →' : 'Mon espace étudiant →'}
        </a>
      </td>
    </tr>
  </table>
</td></tr>
<tr>
  <td style="background:#f9fafb;border-top:1px solid #e5e7eb;padding:16px 40px;text-align:center;">
    <p style="margin:0 0 4px;font-size:11px;color:#9ca3af;">
      ${isEn
        ? 'You received this email because you are a Joda Company student.'
        : 'Vous recevez cet email en tant qu\'étudiant Joda Company.'}
    </p>
    <p style="margin:0;font-size:12px;color:#9ca3af;">© ${year} Joda Company — ${isEn ? 'All rights reserved' : 'Tous droits réservés'}</p>
  </td>
</tr>
</table>
</td></tr>
</table>
</body></html>`,
    });
    console.log(`[Email] Newsletter envoyée à ${data.studentEmail}`);
    return true;
  } catch (err) {
    console.error('[Email] Erreur sendNewsletterEmail:', err);
    return false;
  }
}

// ── Dossier inactif → student (cron automatisation) ───────────────────────────

interface DossierInactiveEmailData {
  studentName: string;
  studentEmail: string;
  dossierStatus: string;
  inactiveDays: number;
  lang?: Lang;
}

export async function sendDossierInactiveEmail(data: DossierInactiveEmailData): Promise<boolean> {
  const lang = data.lang ?? 'fr';
  const isEn = lang === 'en';
  const year = new Date().getFullYear();

  const statusLabels: Record<string, Record<Lang, string>> = {
    en_attente:       { fr: 'En attente',        en: 'Pending' },
    en_cours:         { fr: 'En cours',           en: 'In progress' },
    document_manquant:{ fr: 'Document manquant',  en: 'Missing document' },
  };
  const statusLabel = statusLabels[data.dossierStatus]?.[lang] ?? data.dossierStatus;

  try {
    await getResend().emails.send({
      from: FROM_EMAIL,
      to: [data.studentEmail],
      subject: isEn
        ? `Your scholarship file — ${data.inactiveDays} days without update`
        : `Votre dossier de bourse — ${data.inactiveDays} jours sans mise à jour`,
      html: `<!DOCTYPE html>
<html lang="${lang}"><head><meta charset="UTF-8"/></head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f5;padding:40px 0;">
<tr><td align="center">
<table width="560" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">
${emailHeader(lang)}
<tr><td style="padding:36px 40px;">
  <p style="margin:0 0 8px;font-size:16px;color:#111827;">${isEn ? 'Hello' : 'Bonjour'} <strong>${data.studentName}</strong>,</p>
  <p style="margin:0 0 24px;font-size:14px;color:#6b7280;line-height:1.6;">
    ${isEn
      ? `We noticed that your scholarship file has had no update for <strong>${data.inactiveDays} days</strong>. Current status: <strong>${statusLabel}</strong>.`
      : `Nous avons remarqué que votre dossier de bourse n'a pas été mis à jour depuis <strong>${data.inactiveDays} jours</strong>. Statut actuel : <strong>${statusLabel}</strong>.`}
  </p>
  <div style="background:#fef9c3;border:1px solid #fde047;border-radius:8px;padding:16px 20px;margin-bottom:24px;">
    <p style="margin:0;font-size:13px;color:#713f12;line-height:1.6;">
      ${isEn
        ? '💡 If you have questions or need help with your file, contact your Joda Company advisor via your student space.'
        : '💡 Si vous avez des questions ou besoin d\'aide sur votre dossier, contactez votre conseiller Joda Company via votre espace étudiant.'}
    </p>
  </div>
  <table cellpadding="0" cellspacing="0" style="margin-top:20px;">
    <tr>
      <td style="background:#dc2626;border-radius:8px;">
        <a href="https://gestion-joda.vercel.app/etudiant"
           style="display:inline-block;padding:12px 28px;color:#ffffff;font-size:14px;font-weight:600;text-decoration:none;">
          ${isEn ? 'Check my file →' : 'Voir mon dossier →'}
        </a>
      </td>
    </tr>
  </table>
</td></tr>
${emailFooter(year, lang)}
</table>
</td></tr>
</table>
</body></html>`,
    });
    console.log(`[Email] Relance dossier inactif envoyée à ${data.studentEmail} (${data.inactiveDays}j)`);
    return true;
  } catch (err) {
    console.error('[Email] Erreur sendDossierInactiveEmail:', err);
    return false;
  }
}

// ── Nouveau compte étudiant → admins ──────────────────────────────────────────

interface NewStudentAdminEmailData {
  studentName: string;
  studentUsername: string;
  studentEmail: string;
  adminEmails: string[];
}

export async function sendNewStudentAdminEmail(data: NewStudentAdminEmailData): Promise<boolean> {
  if (data.adminEmails.length === 0) return false;
  const year = new Date().getFullYear();

  try {
    await getResend().emails.send({
      from: FROM_EMAIL,
      to: data.adminEmails,
      subject: `👤 Nouveau compte étudiant — ${data.studentName}`,
      html: `<!DOCTYPE html>
<html lang="fr"><head><meta charset="UTF-8"/></head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f5;padding:40px 0;">
<tr><td align="center">
<table width="560" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">
${emailHeader()}
<tr><td style="padding:36px 40px;">
  <p style="margin:0 0 20px;font-size:15px;color:#111827;">Un nouveau compte étudiant vient d'être créé sur la plateforme :</p>
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:8px;margin-bottom:24px;">
    <tr><td style="padding:20px 24px;">
      <table width="100%" cellpadding="0" cellspacing="0">
        <tr>
          <td style="padding:6px 0;font-size:13px;color:#6b7280;width:140px;">Nom</td>
          <td style="padding:6px 0;font-size:13px;color:#111827;font-weight:600;">${data.studentName}</td>
        </tr>
        <tr>
          <td style="padding:6px 0;font-size:13px;color:#6b7280;">Identifiant</td>
          <td style="padding:6px 0;font-size:13px;color:#111827;font-weight:600;">${data.studentUsername}</td>
        </tr>
        <tr>
          <td style="padding:6px 0;font-size:13px;color:#6b7280;">Email de contact</td>
          <td style="padding:6px 0;font-size:13px;color:#111827;font-weight:600;">${data.studentEmail}</td>
        </tr>
        <tr>
          <td style="padding:6px 0;font-size:13px;color:#6b7280;">Créé le</td>
          <td style="padding:6px 0;font-size:13px;color:#111827;font-weight:600;">${new Date().toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' })}</td>
        </tr>
      </table>
    </td></tr>
  </table>
  <table cellpadding="0" cellspacing="0">
    <tr>
      <td style="background:#dc2626;border-radius:8px;">
        <a href="https://portal-joda.company" style="display:inline-block;padding:12px 28px;color:#ffffff;font-size:14px;font-weight:600;text-decoration:none;">
          Voir le dossier →
        </a>
      </td>
    </tr>
  </table>
</td></tr>
${emailFooter(year)}
</table>
</td></tr>
</table>
</body></html>`,
    });
    console.log(`[Email] Nouveau étudiant notifié à ${data.adminEmails.length} admin(s)`);
    return true;
  } catch (err) {
    console.error('[Email] Erreur sendNewStudentAdminEmail:', err);
    return false;
  }
}
