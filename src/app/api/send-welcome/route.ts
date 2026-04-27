import { NextRequest, NextResponse } from "next/server";
import nodemailer from "nodemailer";

const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
        user: process.env.GMAIL_USER,
        pass: process.env.GMAIL_APP_PASSWORD,
    },
});

export async function POST(req: NextRequest) {
    const { name, email, username, password, role } = await req.json();

    if (!email || !name || !password) {
        return NextResponse.json({ error: "Paramètres manquants" }, { status: 400 });
    }

    const roleLabels: Record<string, string> = {
        student: "Étudiant",
        agent: "Agent",
        admin: "Administrateur",
        supervisor: "Superviseur",
        super_admin: "Super Administrateur",
    };

    try {
        await transporter.sendMail({
            from: `"Joda Company" <${process.env.GMAIL_USER}>`,
            to: email,
            subject: "Vos informations de connexion - Joda Company",
            html: `
<!DOCTYPE html>
<html lang="fr">
<head><meta charset="UTF-8" /><meta name="viewport" content="width=device-width, initial-scale=1.0" /></head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f5;padding:40px 0;">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">

        <!-- Header -->
        <tr>
          <td style="background:linear-gradient(135deg,#dc2626,#b91c1c);padding:32px 40px;text-align:center;">
            <h1 style="margin:0;color:#ffffff;font-size:24px;font-weight:700;">Joda Company</h1>
            <p style="margin:6px 0 0;color:rgba(255,255,255,0.85);font-size:13px;">Gestion des bourses d'études en Chine</p>
          </td>
        </tr>

        <!-- Body -->
        <tr>
          <td style="padding:36px 40px;">
            <p style="margin:0 0 8px;font-size:16px;color:#111827;">Bonjour <strong>${name}</strong>,</p>
            <p style="margin:0 0 28px;font-size:14px;color:#6b7280;line-height:1.6;">
              Votre compte a été créé sur la plateforme Joda Company. Voici vos informations de connexion :
            </p>

            <!-- Credentials box -->
            <table width="100%" cellpadding="0" cellspacing="0" style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:8px;margin-bottom:28px;">
              <tr>
                <td style="padding:20px 24px;">
                  <table width="100%" cellpadding="0" cellspacing="0">
                    <tr>
                      <td style="padding:6px 0;font-size:13px;color:#6b7280;width:140px;">Nom d'utilisateur</td>
                      <td style="padding:6px 0;font-size:13px;color:#111827;font-weight:600;">${username}</td>
                    </tr>
                    <tr>
                      <td style="padding:6px 0;font-size:13px;color:#6b7280;">Email</td>
                      <td style="padding:6px 0;font-size:13px;color:#111827;font-weight:600;">${email}</td>
                    </tr>
                    <tr>
                      <td style="padding:6px 0;font-size:13px;color:#6b7280;">Mot de passe</td>
                      <td style="padding:6px 0;">
                        <span style="font-size:13px;color:#111827;font-weight:600;font-family:monospace;background:#fff;border:1px solid #e5e7eb;border-radius:4px;padding:4px 10px;">${password}</span>
                      </td>
                    </tr>
                    <tr>
                      <td style="padding:6px 0;font-size:13px;color:#6b7280;">Rôle</td>
                      <td style="padding:6px 0;">
                        <span style="background:#fef2f2;color:#dc2626;font-size:12px;font-weight:600;padding:2px 10px;border-radius:20px;">${roleLabels[role] || role}</span>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>
            </table>

            <p style="margin:0 0 24px;font-size:13px;color:#6b7280;line-height:1.6;">
              Pour des raisons de sécurité, nous vous recommandons de changer votre mot de passe dès votre première connexion.
            </p>

            <!-- CTA -->
            <table cellpadding="0" cellspacing="0" style="margin-bottom:28px;">
              <tr>
                <td style="background:#dc2626;border-radius:8px;">
                  <a href="${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}"
                     style="display:inline-block;padding:12px 28px;color:#ffffff;font-size:14px;font-weight:600;text-decoration:none;">
                    Se connecter →
                  </a>
                </td>
              </tr>
            </table>

            <p style="margin:0;font-size:12px;color:#9ca3af;line-height:1.6;">
              Si vous n'êtes pas à l'origine de cette demande, ignorez cet email ou contactez l'administration.
            </p>
          </td>
        </tr>

        <!-- Footer -->
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

        return NextResponse.json({ success: true });
    } catch (error: any) {
        console.error("Erreur envoi email:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
