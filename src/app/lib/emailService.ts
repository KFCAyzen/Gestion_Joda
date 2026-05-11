import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_APP_PASSWORD,
  },
});

interface PaymentReminderData {
  studentName: string;
  studentEmail: string;
  paymentType: 'bourse' | 'mandarin' | 'anglais';
  tranche: number;
  amount: number;
  dueDate: string;
  daysLate: number;
  penalties: number;
}

export async function sendPaymentReminder(data: PaymentReminderData): Promise<boolean> {
  const paymentTypeLabels = {
    bourse: 'Procédure Bourse',
    mandarin: 'Cours de Mandarin',
    anglais: 'Cours d\'Anglais',
  };

  const bourseTrancheLabels: Record<number, string> = {
    1: 'Ouverture de dossier',
    2: 'Caution',
    3: 'Visa',
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('fr-FR', {
      minimumFractionDigits: 0,
    }).format(amount) + ' FCFA';
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
    });
  };

  const urgencyLevel = data.daysLate <= 3 ? 'modérée' : data.daysLate <= 7 ? 'importante' : 'critique';
  const urgencyColor = data.daysLate <= 3 ? '#f59e0b' : data.daysLate <= 7 ? '#ef4444' : '#dc2626';

  try {
    await transporter.sendMail({
      from: `"Joda Company" <${process.env.GMAIL_USER}>`,
      to: data.studentEmail,
      subject: `⚠️ Rappel de paiement - ${data.daysLate} jour(s) de retard`,
      html: `
<!DOCTYPE html>
<html lang="fr">
<head><meta charset="UTF-8" /></head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f5;padding:40px 0;">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">
        
        <!-- En-tête -->
        <tr>
          <td style="background:linear-gradient(135deg,#dc2626,#b91c1c);padding:32px 40px;text-align:center;">
            <h1 style="margin:0;color:#ffffff;font-size:24px;font-weight:700;">Joda Company</h1>
            <p style="margin:6px 0 0;color:rgba(255,255,255,0.85);font-size:13px;">Gestion des bourses d'études en Chine</p>
          </td>
        </tr>

        <!-- Alerte de retard -->
        <tr>
          <td style="padding:24px 40px;background:${urgencyColor}10;border-bottom:3px solid ${urgencyColor};">
            <div style="text-align:center;">
              <div style="display:inline-block;background:${urgencyColor};color:#ffffff;padding:8px 20px;border-radius:20px;font-size:12px;font-weight:700;text-transform:uppercase;margin-bottom:12px;">
                ⚠️ Urgence ${urgencyLevel}
              </div>
              <h2 style="margin:0;color:${urgencyColor};font-size:20px;font-weight:700;">
                Paiement en retard de ${data.daysLate} jour(s)
              </h2>
            </div>
          </td>
        </tr>

        <!-- Contenu principal -->
        <tr>
          <td style="padding:36px 40px;">
            <p style="margin:0 0 8px;font-size:16px;color:#111827;">Bonjour <strong>${data.studentName}</strong>,</p>
            <p style="margin:0 0 28px;font-size:14px;color:#6b7280;line-height:1.6;">
              Nous vous informons qu'un paiement est en retard. Voici les détails :
            </p>

            <!-- Détails du paiement -->
            <table width="100%" cellpadding="0" cellspacing="0" style="background:#f9fafb;border:2px solid ${urgencyColor}40;border-radius:8px;margin-bottom:28px;">
              <tr><td style="padding:20px 24px;">
                <table width="100%" cellpadding="0" cellspacing="0">
                  <tr>
                    <td style="padding:8px 0;font-size:13px;color:#6b7280;width:140px;">Type de paiement</td>
                    <td style="padding:8px 0;font-size:13px;color:#111827;font-weight:600;">
                      ${data.paymentType === 'bourse' && bourseTrancheLabels[data.tranche] ? `${paymentTypeLabels[data.paymentType]} — ${bourseTrancheLabels[data.tranche]}` : `${paymentTypeLabels[data.paymentType]} — Tranche ${data.tranche}`}
                    </td>
                  </tr>
                  <tr>
                    <td style="padding:8px 0;font-size:13px;color:#6b7280;">Montant dû</td>
                    <td style="padding:8px 0;font-size:15px;color:#111827;font-weight:700;">
                      ${formatCurrency(data.amount)}
                    </td>
                  </tr>
                  <tr>
                    <td style="padding:8px 0;font-size:13px;color:#6b7280;">Date limite</td>
                    <td style="padding:8px 0;font-size:13px;color:#dc2626;font-weight:600;">
                      ${formatDate(data.dueDate)}
                    </td>
                  </tr>
                  <tr>
                    <td style="padding:8px 0;font-size:13px;color:#6b7280;">Jours de retard</td>
                    <td style="padding:8px 0;">
                      <span style="background:${urgencyColor};color:#ffffff;font-size:13px;font-weight:700;padding:4px 12px;border-radius:20px;">
                        ${data.daysLate} jour(s)
                      </span>
                    </td>
                  </tr>
                  ${data.penalties > 0 ? `
                  <tr>
                    <td style="padding:8px 0;font-size:13px;color:#6b7280;">Pénalités de retard</td>
                    <td style="padding:8px 0;font-size:14px;color:#dc2626;font-weight:700;">
                      + ${formatCurrency(data.penalties)}
                    </td>
                  </tr>
                  <tr style="border-top:2px solid #e5e7eb;">
                    <td style="padding:12px 0 8px;font-size:14px;color:#111827;font-weight:700;">TOTAL À PAYER</td>
                    <td style="padding:12px 0 8px;font-size:16px;color:#dc2626;font-weight:700;">
                      ${formatCurrency(data.amount + data.penalties)}
                    </td>
                  </tr>
                  ` : ''}
                </table>
              </td></tr>
            </table>

            <!-- Message d'urgence -->
            <div style="background:#fef2f2;border-left:4px solid #dc2626;padding:16px 20px;margin-bottom:28px;border-radius:4px;">
              <p style="margin:0;font-size:13px;color:#991b1b;line-height:1.6;">
                <strong>⚠️ Action requise :</strong> Veuillez régulariser votre situation dans les plus brefs délais pour éviter l'accumulation de pénalités supplémentaires et le blocage de votre dossier.
              </p>
            </div>

            <!-- Informations de contact -->
            <div style="background:#f0fdf4;border:1px solid #bbf7d0;padding:16px 20px;margin-bottom:28px;border-radius:8px;">
              <p style="margin:0 0 8px;font-size:13px;color:#166534;font-weight:600;">
                💬 Besoin d'aide ?
              </p>
              <p style="margin:0;font-size:12px;color:#15803d;line-height:1.6;">
                Si vous rencontrez des difficultés, contactez-nous immédiatement :<br>
                📧 Email: contact@joda.app<br>
                📞 Téléphone: +237 XXX XXX XXX
              </p>
            </div>

            <!-- Bouton d'action -->
            <table cellpadding="0" cellspacing="0" style="margin:0 auto;">
              <tr>
                <td style="background:#dc2626;border-radius:8px;">
                  <a href="https://gestion-joda.vercel.app/etudiant"
                     style="display:inline-block;padding:14px 32px;color:#ffffff;font-size:14px;font-weight:600;text-decoration:none;">
                    Voir mon espace étudiant →
                  </a>
                </td>
              </tr>
            </table>
          </td>
        </tr>

        <!-- Pied de page -->
        <tr>
          <td style="background:#f9fafb;border-top:1px solid #e5e7eb;padding:20px 40px;text-align:center;">
            <p style="margin:0 0 8px;font-size:11px;color:#6b7280;">
              Cet email est un rappel automatique. Merci de ne pas y répondre directement.
            </p>
            <p style="margin:0;font-size:12px;color:#9ca3af;">
              © ${new Date().getFullYear()} Joda Company — Tous droits réservés
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

interface WelcomeEmailData {
  name: string;
  email: string;
  username: string;
  password: string;
  role: string;
}

export async function sendWelcomeEmail(data: WelcomeEmailData): Promise<boolean> {
  const roleLabels: Record<string, string> = {
    student: 'Étudiant',
    agent: 'Agent',
    admin: 'Administrateur',
    supervisor: 'Superviseur',
    super_admin: 'Super Administrateur',
  };

  try {
    await transporter.sendMail({
      from: `"Joda Company" <${process.env.GMAIL_USER}>`,
      to: data.email,
      subject: 'Bienvenue sur la plateforme Joda Company',
      html: `
<!DOCTYPE html>
<html lang="fr">
<head><meta charset="UTF-8" /></head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f5;padding:40px 0;">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">
        <tr>
          <td style="background:linear-gradient(135deg,#dc2626,#b91c1c);padding:32px 40px;text-align:center;">
            <h1 style="margin:0;color:#ffffff;font-size:24px;font-weight:700;">Joda Company</h1>
            <p style="margin:6px 0 0;color:rgba(255,255,255,0.85);font-size:13px;">Gestion des bourses d'études en Chine</p>
          </td>
        </tr>
        <tr>
          <td style="padding:36px 40px;">
            <p style="margin:0 0 8px;font-size:16px;color:#111827;">Bonjour <strong>${data.name}</strong>,</p>
            <p style="margin:0 0 28px;font-size:14px;color:#6b7280;line-height:1.6;">
              Votre compte a été créé sur la plateforme Joda Company. Voici vos informations de connexion :
            </p>
            <table width="100%" cellpadding="0" cellspacing="0" style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:8px;margin-bottom:28px;">
              <tr><td style="padding:20px 24px;">
                <table width="100%" cellpadding="0" cellspacing="0">
                  <tr>
                    <td style="padding:6px 0;font-size:13px;color:#6b7280;width:140px;">Nom d'utilisateur</td>
                    <td style="padding:6px 0;font-size:13px;color:#111827;font-weight:600;">${data.username}</td>
                  </tr>
                  <tr>
                    <td style="padding:6px 0;font-size:13px;color:#6b7280;">Email</td>
                    <td style="padding:6px 0;font-size:13px;color:#111827;font-weight:600;">${data.email}</td>
                  </tr>
                  <tr>
                    <td style="padding:6px 0;font-size:13px;color:#6b7280;">Mot de passe</td>
                    <td style="padding:6px 0;">
                      <span style="font-size:13px;color:#111827;font-weight:600;font-family:monospace;background:#fff;border:1px solid #e5e7eb;border-radius:4px;padding:4px 10px;">${data.password}</span>
                    </td>
                  </tr>
                  <tr>
                    <td style="padding:6px 0;font-size:13px;color:#6b7280;">Rôle</td>
                    <td style="padding:6px 0;">
                      <span style="background:#fef2f2;color:#dc2626;font-size:12px;font-weight:600;padding:2px 10px;border-radius:20px;">${roleLabels[data.role] || data.role}</span>
                    </td>
                  </tr>
                </table>
              </td></tr>
            </table>
            <p style="margin:0 0 24px;font-size:13px;color:#6b7280;line-height:1.6;">
              Pour des raisons de sécurité, nous vous recommandons de changer votre mot de passe dès votre première connexion.
            </p>
            <table cellpadding="0" cellspacing="0" style="margin-bottom:28px;">
              <tr>
                <td style="background:#dc2626;border-radius:8px;">
                  <a href="https://gestion-joda.vercel.app"
                     style="display:inline-block;padding:12px 28px;color:#ffffff;font-size:14px;font-weight:600;text-decoration:none;">
                    Se connecter →
                  </a>
                </td>
              </tr>
            </table>
          </td>
        </tr>
        <tr>
          <td style="background:#f9fafb;border-top:1px solid #e5e7eb;padding:20px 40px;text-align:center;">
            <p style="margin:0;font-size:12px;color:#9ca3af;">© ${new Date().getFullYear()} Joda Company — Tous droits réservés</p>
          </td>
        </tr>
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
