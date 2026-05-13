import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import nodemailer from "nodemailer";
import { buildStudentAuthEmail } from "@/app/lib/student-auth";
import { getLang, type Lang } from "@/app/lib/emailService";

const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
        user: process.env.GMAIL_USER,
        pass: process.env.GMAIL_APP_PASSWORD,
    },
});

function resetEmailHtml(name: string, resetLink: string, year: number, lang: Lang = 'fr') {
    const isEn = lang === 'en';
    const subtitle = isEn ? 'China Scholarship Management' : "Gestion des bourses d'études en Chine";
    const rights = isEn ? 'All rights reserved' : 'Tous droits réservés';
    return `<!DOCTYPE html>
<html lang="${lang}">
<head><meta charset="UTF-8" /></head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f5;padding:40px 0;">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">
        <tr>
          <td style="background:linear-gradient(135deg,#dc2626,#b91c1c);padding:32px 40px;text-align:center;">
            <h1 style="margin:0;color:#ffffff;font-size:24px;font-weight:700;">Joda Company</h1>
            <p style="margin:6px 0 0;color:rgba(255,255,255,0.85);font-size:13px;">${subtitle}</p>
          </td>
        </tr>
        <tr>
          <td style="padding:36px 40px;">
            <p style="margin:0 0 8px;font-size:16px;color:#111827;">${isEn ? 'Hello' : 'Bonjour'} <strong>${name}</strong>,</p>
            <p style="margin:0 0 28px;font-size:14px;color:#6b7280;line-height:1.6;">
              ${isEn
                ? 'You have requested a password reset. Click the button below to set a new one. This link is valid for <strong>24 hours</strong>.'
                : 'Vous avez demandé la réinitialisation de votre mot de passe. Cliquez sur le bouton ci-dessous pour en définir un nouveau. Ce lien est valable <strong>24 heures</strong>.'}
            </p>
            <table cellpadding="0" cellspacing="0" style="margin-bottom:28px;">
              <tr>
                <td style="background:#dc2626;border-radius:8px;">
                  <a href="${resetLink}"
                     style="display:inline-block;padding:14px 32px;color:#ffffff;font-size:14px;font-weight:600;text-decoration:none;">
                    ${isEn ? 'Reset my password →' : 'Réinitialiser mon mot de passe →'}
                  </a>
                </td>
              </tr>
            </table>
            <div style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:8px;padding:16px 20px;margin-bottom:24px;">
              <p style="margin:0 0 6px;font-size:12px;color:#6b7280;">${isEn ? "If the button doesn't work, copy this link into your browser:" : 'Si le bouton ne fonctionne pas, copiez ce lien dans votre navigateur :'}</p>
              <p style="margin:0;font-size:11px;color:#9ca3af;word-break:break-all;">${resetLink}</p>
            </div>
            <p style="margin:0;font-size:12px;color:#9ca3af;line-height:1.6;">
              ${isEn
                ? "If you did not request this reset, ignore this email. Your password will remain unchanged."
                : "Si vous n'avez pas demandé cette réinitialisation, ignorez cet email. Votre mot de passe restera inchangé."}
            </p>
          </td>
        </tr>
        <tr>
          <td style="background:#f9fafb;border-top:1px solid #e5e7eb;padding:20px 40px;text-align:center;">
            <p style="margin:0;font-size:12px;color:#9ca3af;">© ${year} Joda Company — ${rights}</p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

export async function POST(req: NextRequest) {
    // Always return 200 to prevent email enumeration
    try {
        const body = await req.json();
        const { email, username } = body as { email?: string; username?: string };

        if (!email && !username) {
            return NextResponse.json({ success: true });
        }

        let authEmail: string;
        let recipientEmail: string;
        let recipientName = "Utilisateur";

        let lang: Lang = 'fr';

        if (username) {
            // Student flow: username → auth email @students.joda.app + vrai email depuis users.email
            authEmail = buildStudentAuthEmail(username);

            const { data: userRow } = await supabaseAdmin
                .from("users")
                .select("contact_email, name, id")
                .eq("username", username)
                .eq("role", "student")
                .maybeSingle();

            if (!userRow?.contact_email) return NextResponse.json({ success: true });

            recipientEmail = userRow.contact_email;
            recipientName = userRow.name || username;

            // Récupérer la langue préférée de l'étudiant
            const { data: studentRow } = await supabaseAdmin
                .from("students")
                .select("langue")
                .eq("user_id", userRow.id)
                .maybeSingle();
            lang = getLang(studentRow?.langue);
        } else {
            // Staff flow: email = auth email = recipient email (toujours en français)
            authEmail = email!;
            recipientEmail = email!;

            const { data: userRow } = await supabaseAdmin
                .from("users")
                .select("name")
                .eq("email", email)
                .maybeSingle();

            recipientName = userRow?.name || "Utilisateur";
        }

        const { data, error } = await supabaseAdmin.auth.admin.generateLink({
            type: "recovery",
            email: authEmail,
            options: { redirectTo: "https://gestion-joda.vercel.app/auth/callback" },
        });

        if (error) {
            console.error("[forgot-password] generateLink:", error.message);
            return NextResponse.json({ success: true });
        }

        const resetLink = data.properties.action_link;

        const isEn = lang === 'en';
        await transporter.sendMail({
            from: `"Joda Company" <${process.env.GMAIL_USER}>`,
            to: recipientEmail,
            subject: isEn
                ? "Password reset - Joda Company"
                : "Réinitialisation de votre mot de passe - Joda Company",
            html: resetEmailHtml(recipientName, resetLink, new Date().getFullYear(), lang),
        });

        console.log(`[forgot-password] Lien de reset envoyé à ${recipientEmail}`);
    } catch (err: any) {
        console.error("[forgot-password] error:", err?.message);
    }

    return NextResponse.json({ success: true });
}
