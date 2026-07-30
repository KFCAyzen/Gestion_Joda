import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { Resend } from "resend";
import { z } from "zod";
import { buildStudentAuthEmail } from "@/app/lib/student-auth";
import { EMAIL_APP_URL, getLang, type Lang } from "@/app/lib/emailService";
import { sendSmsToPhone } from "@/app/lib/smsService";
import { createResetToken } from "@/app/lib/passwordReset";

const forgotPasswordBodySchema = z.object({
    email: z.string().email().optional(),
    username: z.string().min(1).optional(),
    channel: z.enum(["email", "sms"]).optional().default("email"),
});

const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const resend = new Resend(process.env.RESEND_API_KEY);
const FROM_EMAIL = "Joda Company <contact@portal-joda.company>";

// Rate-limit en mémoire : un même userId ne peut réinitialiser son mdp qu'une fois
// toutes les RESET_COOLDOWN_MS millisecondes. Évite qu'un attaquant connaissant
// l'email d'un admin puisse spam-réinitialiser son mdp et le déconnecter en boucle.
// TODO multi-instance : déplacer vers une colonne `last_password_reset_at` en DB.
const RESET_COOLDOWN_MS = 5 * 60 * 1000;
const lastResetByUser = new Map<string, number>();

function isOnCooldown(userId: string): boolean {
    const last = lastResetByUser.get(userId);
    if (!last) return false;
    return Date.now() - last < RESET_COOLDOWN_MS;
}

function markReset(userId: string): void {
    lastResetByUser.set(userId, Date.now());
    // Garbage-collect : on garde au plus 5000 entrées.
    if (lastResetByUser.size > 5000) {
        const cutoff = Date.now() - RESET_COOLDOWN_MS;
        for (const [k, v] of lastResetByUser) {
            if (v < cutoff) lastResetByUser.delete(k);
        }
    }
}

function resetLinkEmailHtml(
    name: string,
    username: string,
    resetUrl: string,
    year: number,
    lang: Lang = "fr"
) {
    const isEn = lang === "en";
    const subtitle = isEn ? "China Scholarship Management" : "Gestion des bourses d'études en Chine";
    const rights = isEn ? "All rights reserved" : "Tous droits réservés";
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
            <p style="margin:0 0 8px;font-size:16px;color:#111827;">${isEn ? "Hello" : "Bonjour"} <strong>${name}</strong>,</p>
            <p style="margin:0 0 28px;font-size:14px;color:#6b7280;line-height:1.6;">
              ${isEn
                ? "You requested to reset your password. Click the button below to choose a new one. <strong>Your current password remains valid</strong> until you complete this step."
                : "Vous avez demandé la réinitialisation de votre mot de passe. Cliquez sur le bouton ci-dessous pour en choisir un nouveau. <strong>Votre mot de passe actuel reste valide</strong> jusqu'à ce que vous alliez au bout."}
            </p>
            <table width="100%" cellpadding="0" cellspacing="0" style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:8px;margin-bottom:28px;">
              <tr><td style="padding:20px 24px;">
                <table width="100%" cellpadding="0" cellspacing="0">
                  <tr>
                    <td style="padding:6px 0;font-size:13px;color:#6b7280;width:160px;">${isEn ? "Username" : "Identifiant"}</td>
                    <td style="padding:6px 0;font-size:13px;color:#111827;font-weight:600;">${username}</td>
                  </tr>
                </table>
              </td></tr>
            </table>
            <table cellpadding="0" cellspacing="0" style="margin-bottom:28px;">
              <tr>
                <td style="background:#dc2626;border-radius:8px;">
                  <a href="${resetUrl}"
                     style="display:inline-block;padding:14px 32px;color:#ffffff;font-size:14px;font-weight:600;text-decoration:none;">
                    ${isEn ? "Choose a new password →" : "Choisir un nouveau mot de passe →"}
                  </a>
                </td>
              </tr>
            </table>
            <p style="margin:0 0 12px;font-size:12px;color:#9ca3af;line-height:1.6;">
              ${isEn
                ? "This link expires in 1 hour and can only be used once."
                : "Ce lien expire dans 1 heure et ne peut servir qu'une seule fois."}
            </p>
            <p style="margin:0;font-size:12px;color:#9ca3af;line-height:1.6;">
              ${isEn
                ? "If you did not request this reset, you can ignore this email — nothing has changed on your account."
                : "Si vous n'êtes pas à l'origine de cette demande, ignorez cet email : rien n'a changé sur votre compte."}
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
    // Always return 200 to prevent account enumeration
    try {
        const parsed = forgotPasswordBodySchema.safeParse(await req.json());
        const { email, username, channel = "email" } = parsed.success ? parsed.data : {};

        if (!email && !username) {
            return NextResponse.json({ success: true });
        }

        let userId: string;
        let recipientEmail: string | null = null;
        let recipientPhone: string | null = null;
        let recipientName = "Utilisateur";
        let displayUsername: string;
        let lang: Lang = "fr";

        if (username) {
            displayUsername = username;
            // Vérifier que l'email auth @students.joda.app existe bien
            buildStudentAuthEmail(username);

            const { data: userRow } = await supabaseAdmin
                .from("users")
                .select("id, contact_email, name, telephone")
                .eq("username", username)
                .eq("role", "student")
                .maybeSingle();

            if (!userRow) return NextResponse.json({ success: true });

            userId = userRow.id;
            recipientEmail = userRow.contact_email;
            recipientPhone = userRow.telephone;
            recipientName = userRow.name || username;

            const { data: studentRow } = await supabaseAdmin
                .from("students")
                .select("langue")
                .eq("user_id", userRow.id)
                .maybeSingle();
            lang = getLang(studentRow?.langue);
        } else {
            displayUsername = email!;

            const { data: userRow } = await supabaseAdmin
                .from("users")
                .select("id, name, telephone")
                .eq("email", email)
                .maybeSingle();

            if (!userRow) return NextResponse.json({ success: true });

            userId = userRow.id;
            recipientEmail = email!;
            recipientPhone = userRow.telephone;
            recipientName = userRow.name || "Utilisateur";
        }

        // Rate-limit : si l'utilisateur a déjà reset son mdp dans les 5 dernières minutes,
        // on retourne 200 silencieusement (toujours pour éviter l'énumération) sans changer
        // le mdp. Protège contre les attaques de déni-de-service par spam-reset.
        if (isOnCooldown(userId)) {
            console.warn(`[forgot-password] cooldown actif pour user ${userId}, requête ignorée`);
            return NextResponse.json({ success: true });
        }

        const isEn = lang === "en";
        const year = new Date().getFullYear();

        // Le mot de passe courant n'est PAS touché ici. Il ne changera que lorsque
        // l'utilisateur ouvrira le lien et choisira lui-même son nouveau mot de passe
        // (voir /api/reset-password/confirm). Conséquences : un email perdu ou classé en
        // spam n'a plus aucun effet, et un tiers connaissant l'email d'un collègue ne
        // peut plus lui verrouiller son accès.
        const { rawToken, tokenHash, expiresAt } = createResetToken();

        const { error: tokenError } = await supabaseAdmin.from("password_reset_tokens").insert({
            user_id: userId,
            token_hash: tokenHash,
            expires_at: expiresAt,
        });

        if (tokenError) {
            console.error("[forgot-password] insertion token:", tokenError.message);
            return NextResponse.json({ success: true });
        }

        const resetUrl = `${EMAIL_APP_URL}/${lang}/reset-password?token=${rawToken}`;

        let delivered = false;
        let deliveryError = "aucun canal de remise disponible";

        if (channel === "sms" && recipientPhone) {
            const smsText = isEn
                ? `JODA - Password reset\nChoose a new password: ${resetUrl}\nValid 1h, single use.`
                : `JODA - Reinitialisation\nChoisir un nouveau mot de passe : ${resetUrl}\nValable 1h, usage unique.`;
            const sms = await sendSmsToPhone(recipientPhone, smsText);
            delivered = sms.ok;
            if (!sms.ok) deliveryError = sms.error ?? "echec SMS";
        } else if (recipientEmail) {
            const { error: sendError } = await resend.emails.send({
                from: FROM_EMAIL,
                to: [recipientEmail],
                subject: isEn
                    ? "Reset your password - Joda Company"
                    : "Réinitialisez votre mot de passe - Joda Company",
                html: resetLinkEmailHtml(recipientName, displayUsername, resetUrl, year, lang),
            });
            delivered = !sendError;
            if (sendError) deliveryError = sendError.message;
        }

        if (!delivered) {
            // Révoquer le token : inutile de laisser un lien valide en circulation alors
            // qu'il n'a jamais atteint son destinataire.
            await supabaseAdmin.from("password_reset_tokens").delete().eq("token_hash", tokenHash);
            console.error(`[forgot-password] remise echouee pour user ${userId}:`, deliveryError);
            return NextResponse.json({ success: true });
        }

        markReset(userId);
        console.log(`[forgot-password] lien de reinitialisation envoye a user ${userId}`);
    } catch (err: any) {
        console.error("[forgot-password] error:", err?.message);
    }

    return NextResponse.json({ success: true });
}
