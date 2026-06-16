import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { Resend } from "resend";
import { z } from "zod";
import { requireRole } from "@/app/lib/auth";
import { sendSmsToPhone } from "@/app/lib/smsService";

const resetPasswordBodySchema = z
    .object({
        email: z.string().email().optional(),
        userId: z.string().min(1).optional(),
    })
    .refine((d) => d.email || d.userId, { message: "email ou userId requis" });

const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const resend = new Resend(process.env.RESEND_API_KEY);
const FROM_EMAIL = "Joda Company <contact@portal-joda.company>";

function generateTempPassword(): string {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    let suffix = "";
    for (let i = 0; i < 5; i++) suffix += chars[Math.floor(Math.random() * chars.length)];
    return `Joda@${suffix}`;
}

function credentialsEmailHtml(name: string, username: string, tempPassword: string, year: number) {
    return `<!DOCTYPE html>
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
            <p style="margin:0 0 8px;font-size:16px;color:#111827;">Bonjour <strong>${name}</strong>,</p>
            <p style="margin:0 0 28px;font-size:14px;color:#6b7280;line-height:1.6;">
              Un administrateur a réinitialisé votre mot de passe. Utilisez les identifiants temporaires ci-dessous pour vous connecter, puis changez votre mot de passe immédiatement.
            </p>
            <table width="100%" cellpadding="0" cellspacing="0" style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:8px;margin-bottom:28px;">
              <tr><td style="padding:20px 24px;">
                <table width="100%" cellpadding="0" cellspacing="0">
                  <tr>
                    <td style="padding:6px 0;font-size:13px;color:#6b7280;width:160px;">Identifiant</td>
                    <td style="padding:6px 0;font-size:13px;color:#111827;font-weight:600;">${username}</td>
                  </tr>
                  <tr>
                    <td style="padding:6px 0;font-size:13px;color:#6b7280;">Mot de passe temporaire</td>
                    <td style="padding:6px 0;font-size:14px;color:#dc2626;font-weight:700;font-family:monospace,monospace;">${tempPassword}</td>
                  </tr>
                </table>
              </td></tr>
            </table>
            <table cellpadding="0" cellspacing="0" style="margin-bottom:28px;">
              <tr>
                <td style="background:#dc2626;border-radius:8px;">
                  <a href="https://gestion-joda.vercel.app/login"
                     style="display:inline-block;padding:14px 32px;color:#ffffff;font-size:14px;font-weight:600;text-decoration:none;">
                    Accéder à la connexion →
                  </a>
                </td>
              </tr>
            </table>
            <p style="margin:0;font-size:12px;color:#9ca3af;line-height:1.6;">
              Si vous n'avez pas demandé cette réinitialisation, contactez immédiatement votre administrateur.
            </p>
          </td>
        </tr>
        <tr>
          <td style="background:#f9fafb;border-top:1px solid #e5e7eb;padding:20px 40px;text-align:center;">
            <p style="margin:0;font-size:12px;color:#9ca3af;">© ${year} Joda Company — Tous droits réservés</p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

async function handleResetPassword(req: NextRequest) {
    try {
        const parsed = resetPasswordBodySchema.safeParse(await req.json());
        if (!parsed.success) {
            return NextResponse.json(
                { error: parsed.error.issues[0]?.message ?? "Paramètres invalides" },
                { status: 400 }
            );
        }
        const { email, userId } = parsed.data;

        let authUserId: string;
        let recipientEmail: string;
        let recipientPhone: string | null = null;
        let recipientName = "Utilisateur";
        let displayUsername: string;

        if (userId) {
            const { data: userRow } = await supabaseAdmin
                .from("users")
                .select("id, email, contact_email, name, role, username, telephone")
                .eq("id", userId)
                .maybeSingle();

            if (!userRow) {
                return NextResponse.json({ error: "Utilisateur introuvable" }, { status: 404 });
            }

            authUserId = userRow.id;
            recipientName = userRow.name || userRow.username;
            displayUsername = userRow.username;
            recipientPhone = userRow.telephone;
            // contact_email = vrai email (différent de @students.joda.app pour les étudiants)
            recipientEmail = userRow.contact_email || userRow.email;
        } else if (email) {
            const { data: userRow } = await supabaseAdmin
                .from("users")
                .select("id, name, username, telephone")
                .eq("email", email)
                .maybeSingle();

            if (!userRow) {
                return NextResponse.json({ error: "Utilisateur introuvable" }, { status: 404 });
            }

            authUserId = userRow.id;
            recipientEmail = email;
            recipientName = userRow.name || "Utilisateur";
            displayUsername = userRow.username || email;
            recipientPhone = userRow.telephone;
        } else {
            return NextResponse.json({ error: "email ou userId requis" }, { status: 400 });
        }

        const tempPassword = generateTempPassword();

        const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(authUserId, {
            password: tempPassword,
        });

        if (updateError) {
            console.error("[reset-password] updateUser:", updateError.message);
            return NextResponse.json({ error: updateError.message }, { status: 400 });
        }

        await supabaseAdmin.from("users").update({ must_change_password: true }).eq("id", authUserId);

        const year = new Date().getFullYear();

        await resend.emails.send({
            from: FROM_EMAIL,
            to: [recipientEmail],
            subject: "Votre mot de passe temporaire - Joda Company",
            html: credentialsEmailHtml(recipientName, displayUsername, tempPassword, year),
        });

        if (recipientPhone) {
            const smsText = `JODA - Reinitialisation\nIdentifiant: ${displayUsername}\nMdp temp: ${tempPassword}\nConnexion: https://gestion-joda.vercel.app`;
            sendSmsToPhone(recipientPhone, smsText).catch(console.error);
        }

        console.log(`[reset-password] Credentials sent to ${recipientEmail}`);
        return NextResponse.json({ success: true });
    } catch (err: any) {
        console.error("[reset-password] Unexpected error:", err?.message || err);
        return NextResponse.json({ error: err?.message || "Erreur serveur" }, { status: 500 });
    }
}

export const POST = requireRole(["admin", "super_admin"], handleResetPassword);
