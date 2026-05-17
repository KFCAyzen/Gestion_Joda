import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { Resend } from "resend";
import { z } from "zod";
import { requireRole } from "@/app/lib/auth";

const resetPasswordBodySchema = z.object({
    email: z.string().email().optional(),
    userId: z.string().min(1).optional(),
}).refine((d) => d.email || d.userId, { message: "email ou userId requis" });

const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const resend = new Resend(process.env.RESEND_API_KEY);
const FROM_EMAIL = "Joda Company <contact@portal-joda.company>";

async function handleResetPassword(req: NextRequest) {
    try {
        const parsed = resetPasswordBodySchema.safeParse(await req.json());
        if (!parsed.success) {
            return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Paramètres invalides" }, { status: 400 });
        }
        const { email, userId } = parsed.data;

        let authEmail: string;
        let recipientEmail: string;
        let recipientName = "Utilisateur";

        if (userId) {
            const { data: userRow } = await supabaseAdmin
                .from("users")
                .select("email, name, role, username")
                .eq("id", userId)
                .maybeSingle();

            if (!userRow) {
                return NextResponse.json({ error: "Utilisateur introuvable" }, { status: 404 });
            }

            authEmail = userRow.email;
            recipientName = userRow.name || userRow.username;

            if (userRow.role === "student") {
                // For students, real email is in students table
                const { data: studentRow } = await supabaseAdmin
                    .from("students")
                    .select("email")
                    .eq("created_by", userId)
                    .maybeSingle();
                recipientEmail = studentRow?.email || userRow.email;
            } else {
                recipientEmail = userRow.email;
            }
        } else if (email) {
            authEmail = email;
            recipientEmail = email;
            const { data: userRow } = await supabaseAdmin
                .from("users")
                .select("name")
                .eq("email", email)
                .maybeSingle();
            recipientName = userRow?.name || "Utilisateur";
        } else {
            return NextResponse.json({ error: "email ou userId requis" }, { status: 400 });
        }

        const { data, error } = await supabaseAdmin.auth.admin.generateLink({
            type: 'recovery',
            email: authEmail,
        });

        if (error) {
            console.error("[reset-password] error:", error.message);
            return NextResponse.json({ error: error.message }, { status: 400 });
        }

        const resetLink = data.properties.action_link;

        await resend.emails.send({
            from: FROM_EMAIL,
            to: [recipientEmail],
            subject: "Réinitialisation de votre mot de passe - Joda Company",
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
            <p style="margin:0 0 8px;font-size:16px;color:#111827;">Bonjour <strong>${recipientName}</strong>,</p>
            <p style="margin:0 0 28px;font-size:14px;color:#6b7280;line-height:1.6;">
              Un administrateur a demandé la réinitialisation de votre mot de passe. Cliquez sur le bouton ci-dessous pour définir un nouveau mot de passe. Ce lien est valable 24 heures.
            </p>
            <table cellpadding="0" cellspacing="0" style="margin-bottom:28px;">
              <tr>
                <td style="background:#dc2626;border-radius:8px;">
                  <a href="${resetLink}"
                     style="display:inline-block;padding:14px 32px;color:#ffffff;font-size:14px;font-weight:600;text-decoration:none;">
                    Définir mon nouveau mot de passe →
                  </a>
                </td>
              </tr>
            </table>
            <p style="margin:0;font-size:12px;color:#9ca3af;line-height:1.6;">
              Si vous n'avez pas demandé cette réinitialisation, ignorez cet email. Votre mot de passe restera inchangé.
            </p>
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

        console.log(`[reset-password] Lien de reset envoyé à ${recipientEmail}`);
        return NextResponse.json({ success: true });
    } catch (err: any) {
        console.error("[reset-password] Unexpected error:", err?.message || err);
        return NextResponse.json({ error: err?.message || "Erreur serveur" }, { status: 500 });
    }
}

export const POST = requireRole(['admin', 'super_admin'], handleResetPassword);
