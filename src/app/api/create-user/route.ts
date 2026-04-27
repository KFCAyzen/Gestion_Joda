import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import nodemailer from "nodemailer";

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

export async function POST(req: NextRequest) {
    try {
    const { name, email, username, password, role, authEmail } = await req.json();

    if (!email || !name || !password || !username || !role) {
        return NextResponse.json({ error: "Paramètres manquants" }, { status: 400 });
    }

    // Pour les étudiants, authEmail DOIT être fourni et se terminer par @students.joda.app
    const supabaseEmail = (role === 'student')
        ? (authEmail?.endsWith('@students.joda.app') ? authEmail : `${username.toLowerCase().replace(/[^a-z0-9.]/g, '.')}@students.joda.app`)
        : (authEmail || email);

    console.log("[create-user] supabaseEmail résolu:", supabaseEmail);

    // Vérifier si l'email Auth existe déjà
    const { data: existingUsers } = await supabaseAdmin.auth.admin.listUsers({ perPage: 1000 });
    const alreadyExists = existingUsers?.users?.find(u => u.email === supabaseEmail);
    if (alreadyExists) {
        return NextResponse.json({ error: `Un compte avec l'identifiant ${username} existe déjà` }, { status: 400 });
    }

    // Vérifier aussi si le vrai email existe déjà dans students
    if (role === 'student') {
        const { data: existingStudent } = await supabaseAdmin.from('students').select('id').eq('email', email).maybeSingle();
        if (existingStudent) {
            return NextResponse.json({ error: `Un étudiant avec l'email ${email} existe déjà` }, { status: 400 });
        }
    }

    // Créer l'utilisateur via admin API (pas de rate limit)
    const { data, error: authError } = await supabaseAdmin.auth.admin.createUser({
        email: supabaseEmail,
        password,
        email_confirm: true,
        user_metadata: { username, name, role },
    });

    if (authError) {
        console.error("[create-user] authError:", authError.message);
        return NextResponse.json({ error: authError.message }, { status: 400 });
    }

    if (!data.user) {
        console.error("[create-user] no user returned");
        return NextResponse.json({ error: "Échec création utilisateur" }, { status: 500 });
    }

    // Upsert dans la table users (évite le conflit si l'ID existe déjà)
    const { error: dbError } = await supabaseAdmin.from("users").upsert({
        id: data.user.id,
        email: supabaseEmail,
        username,
        name,
        role,
        password_hash: "managed_by_supabase_auth",
        must_change_password: role === "student",
    }, { onConflict: 'id' });

    if (dbError) {
        // Rollback : supprimer le compte Auth créé
        await supabaseAdmin.auth.admin.deleteUser(data.user.id);
        console.error("[create-user] dbError:", dbError.message);
        return NextResponse.json({ error: dbError.message }, { status: 500 });
    }

    // Envoyer l'email de bienvenue
    const roleLabels: Record<string, string> = {
        student: "Étudiant", agent: "Agent", admin: "Administrateur",
        supervisor: "Superviseur", super_admin: "Super Administrateur",
    };

    try {
        await transporter.sendMail({
            from: `"Joda Company" <${process.env.GMAIL_USER}>`,
            to: email,
            subject: "Vos informations de connexion - Joda Company",
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
            <p style="margin:0 0 8px;font-size:16px;color:#111827;">Bonjour <strong>${name}</strong>,</p>
            <p style="margin:0 0 28px;font-size:14px;color:#6b7280;line-height:1.6;">
              Votre compte a été créé sur la plateforme Joda Company. Voici vos informations de connexion :
            </p>
            <table width="100%" cellpadding="0" cellspacing="0" style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:8px;margin-bottom:28px;">
              <tr><td style="padding:20px 24px;">
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
              </td></tr>
            </table>
            <p style="margin:0 0 24px;font-size:13px;color:#6b7280;line-height:1.6;">
              Pour des raisons de sécurité, nous vous recommandons de changer votre mot de passe dès votre première connexion.
            </p>
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
    } catch (emailError: any) {
        console.error("Erreur envoi email:", emailError.message);
        // On ne bloque pas si l'email échoue, l'utilisateur est déjà créé
    }

    return NextResponse.json({ success: true, userId: data.user.id });
    } catch (err: any) {
        console.error("[create-user] Unexpected error:", err?.message || err);
        return NextResponse.json({ error: err?.message || "Erreur serveur" }, { status: 500 });
    }
}
