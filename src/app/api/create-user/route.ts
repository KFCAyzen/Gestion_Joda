import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { Resend } from "resend";
import { requireRole } from "@/app/lib/auth";
import { getLang, sendNewStudentAdminEmail } from "@/app/lib/emailService";
import { sendSmsToPhone } from "@/app/lib/smsService";

const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const resend = new Resend(process.env.RESEND_API_KEY);
const FROM_EMAIL = "Joda Company <contact@portal-joda.company>";

function getCreateUserErrorMessage(error: unknown) {
    const rawMessage = error && typeof error === "object" && "message" in error && typeof error.message === "string"
        ? error.message
        : typeof error === "string"
          ? error
          : "";
    const message = rawMessage.toLowerCase();

    if (message.includes("database error creating new user")) {
        return "Le compte d'authentification n'a pas pu être créé à cause d'une configuration base de données. Appliquez la migration de correction du profil utilisateur puis réessayez.";
    }

    if (message.includes("already been registered") || message.includes("already registered") || message.includes("already exists")) {
        return "Un compte existe déjà avec cet email ou cet identifiant.";
    }

    if (message.includes("invalid email")) {
        return "L'adresse email n'est pas valide.";
    }

    if (message.includes("password")) {
        return "Le mot de passe temporaire ne respecte pas les règles de sécurité.";
    }

    return rawMessage || "Impossible de créer le compte pour le moment. Réessayez dans un instant.";
}

async function handleCreateUser(req: NextRequest) {
    try {
    const { name, email, username, password, role, authEmail, telephone, langue } = await req.json();

    if (!email || !name || !password || !username || !role) {
        return NextResponse.json({ error: "Paramètres manquants" }, { status: 400 });
    }

    // Valider que le rôle est valide
    const validRoles = ['student', 'agent', 'supervisor', 'admin', 'super_admin'];
    if (!validRoles.includes(role)) {
        return NextResponse.json({ error: "Rôle invalide" }, { status: 400 });
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
        user_metadata: {
            username,
            name,
            role,
            telephone: telephone || null,
            must_change_password: role === "student",
            is_active: true,
        },
        app_metadata:  { role },
    });

    if (authError) {
        console.error("[create-user] authError:", authError.message);
        return NextResponse.json({ error: getCreateUserErrorMessage(authError) }, { status: 400 });
    }

    if (!data.user) {
        console.error("[create-user] no user returned");
        return NextResponse.json({ error: "Échec création utilisateur" }, { status: 500 });
    }

    // Upsert dans la table users (évite le conflit si l'ID existe déjà)
    const { error: dbError } = await supabaseAdmin.from("users").upsert({
        id: data.user.id,
        email: supabaseEmail,
        contact_email: email,  // vrai email de contact (différent du @students.joda.app pour les étudiants)
        username,
        name,
        role,
        telephone: telephone || null,
        password_hash: "managed_by_supabase_auth",
        must_change_password: role === "student",
        is_active: true,
    }, { onConflict: 'id' });

    if (dbError) {
        // Rollback : supprimer le compte Auth créé
        await supabaseAdmin.auth.admin.deleteUser(data.user.id);
        console.error("[create-user] dbError:", dbError.message);
        return NextResponse.json({ error: dbError.message }, { status: 500 });
    }

    // Générer un lien de définition de mot de passe
    let setPasswordLink = 'https://portal-joda.company';
    try {
        const { data: linkData } = await supabaseAdmin.auth.admin.generateLink({
            type: 'recovery',
            email: supabaseEmail,
            options: {
                redirectTo: 'https://portal-joda.company/auth/callback',
            },
        });
        if (linkData?.properties?.action_link) {
            setPasswordLink = linkData.properties.action_link;
        }
    } catch {
        // Non bloquant — l'utilisateur pourra demander un reset ultérieurement
    }

    const lang = role === "student" ? getLang(langue) : "fr";
    const isEn = lang === "en";

    const roleLabels: Record<string, Record<"fr" | "en", string>> = {
        student:     { fr: "Étudiant",             en: "Student" },
        agent:       { fr: "Agent",                en: "Agent" },
        admin:       { fr: "Administrateur",       en: "Administrator" },
        supervisor:  { fr: "Superviseur",          en: "Supervisor" },
        super_admin: { fr: "Super Administrateur", en: "Super Administrator" },
    };
    const subtitle = isEn ? "China Scholarship Management" : "Gestion des bourses d'études en Chine";
    const rights = isEn ? "All rights reserved" : "Tous droits réservés";

    try {
        await resend.emails.send({
            from: FROM_EMAIL,
            to: [email],
            subject: isEn
                ? "Welcome to Joda Company — Activate your account"
                : "Bienvenue sur Joda Company — Activez votre compte",
            html: `
<!DOCTYPE html>
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
                ? "Your account has been created on the Joda Company platform. Click the button below to set your password and access your space. This link is valid for 24 hours."
                : "Votre compte a été créé sur la plateforme Joda Company. Cliquez sur le bouton ci-dessous pour définir votre mot de passe et accéder à votre espace. Ce lien est valable 24 heures."}
            </p>
            <table width="100%" cellpadding="0" cellspacing="0" style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:8px;margin-bottom:28px;">
              <tr><td style="padding:20px 24px;">
                <table width="100%" cellpadding="0" cellspacing="0">
                  <tr>
                    <td style="padding:6px 0;font-size:13px;color:#6b7280;width:140px;">${isEn ? "Username" : "Nom d'utilisateur"}</td>
                    <td style="padding:6px 0;font-size:13px;color:#111827;font-weight:600;">${username}</td>
                  </tr>
                  <tr>
                    <td style="padding:6px 0;font-size:13px;color:#6b7280;">Email</td>
                    <td style="padding:6px 0;font-size:13px;color:#111827;font-weight:600;">${email}</td>
                  </tr>
                  <tr>
                    <td style="padding:6px 0;font-size:13px;color:#6b7280;">${isEn ? "Role" : "Rôle"}</td>
                    <td style="padding:6px 0;">
                      <span style="background:#fef2f2;color:#dc2626;font-size:12px;font-weight:600;padding:2px 10px;border-radius:20px;">${roleLabels[role]?.[lang] || role}</span>
                    </td>
                  </tr>
                </table>
              </td></tr>
            </table>
            <table cellpadding="0" cellspacing="0" style="margin-bottom:28px;">
              <tr>
                <td style="background:#dc2626;border-radius:8px;">
                  <a href="${setPasswordLink}"
                     style="display:inline-block;padding:14px 32px;color:#ffffff;font-size:14px;font-weight:600;text-decoration:none;">
                    ${isEn ? "Set my password →" : "Définir mon mot de passe →"}
                  </a>
                </td>
              </tr>
            </table>
            <p style="margin:0;font-size:12px;color:#9ca3af;line-height:1.6;">
              ${isEn
                ? "If this button doesn't work, copy this link into your browser:"
                : "Si ce bouton ne fonctionne pas, copiez ce lien dans votre navigateur :"}<br>
              <span style="color:#6b7280;word-break:break-all;">${setPasswordLink}</span>
            </p>
          </td>
        </tr>
        <tr>
          <td style="background:#f9fafb;border-top:1px solid #e5e7eb;padding:20px 40px;text-align:center;">
            <p style="margin:0;font-size:12px;color:#9ca3af;">© ${new Date().getFullYear()} Joda Company — ${rights}</p>
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
        // Non bloquant — l'utilisateur est créé, il pourra demander un reset
    }

    // SMS si numéro disponible
    if (telephone) {
        const smsText = isEn
            ? `Hello ${name}, your JODA account has been created.\nUsername: ${username}\nPassword: ${password}\nLogin: https://portal-joda.company`
            : `Bonjour ${name}, votre compte JODA a été créé.\nIdentifiant: ${username}\nMot de passe: ${password}\nConnexion: https://portal-joda.company`;
        sendSmsToPhone(telephone, smsText).catch(console.error);
    }

    // Notifier les admins si c'est un compte étudiant
    if (role === 'student') {
        const { data: admins } = await supabaseAdmin
            .from('users')
            .select('contact_email, email')
            .in('role', ['admin', 'super_admin']);

        const adminEmails = (admins ?? [])
            .map((u: { contact_email?: string; email?: string }) => u.contact_email || u.email)
            .filter(Boolean) as string[];

        sendNewStudentAdminEmail({
            studentName: name,
            studentUsername: username,
            studentEmail: email,
            adminEmails,
        }).catch(console.error);
    }

    return NextResponse.json({ success: true, userId: data.user.id });
    } catch (err: any) {
        console.error("[create-user] Unexpected error:", err?.message || err);
        return NextResponse.json({ error: err?.message || "Erreur serveur" }, { status: 500 });
    }
}

export const POST = requireRole(['admin', 'super_admin'], handleCreateUser);
