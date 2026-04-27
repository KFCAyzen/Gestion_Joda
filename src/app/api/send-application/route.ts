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
    const { studentName, studentEmail, universityName, desiredProgram, studyLevel, scholarshipType } = await req.json();

    if (!studentEmail || !studentName) {
        return NextResponse.json({ error: "Paramètres manquants" }, { status: 400 });
    }

    const documents = [
        "Passeport valide (copie)",
        "Relevé de notes du Baccalauréat",
        "Diplôme du Baccalauréat",
        "Casier judiciaire (moins de 3 mois)",
        "2 photos d'identité récentes",
    ];

    try {
        await transporter.sendMail({
            from: `"Joda Company" <${process.env.GMAIL_USER}>`,
            to: studentEmail,
            subject: "Votre dossier de candidature a été ouvert - Documents requis",
            html: `
<!DOCTYPE html>
<html lang="fr">
<head><meta charset="UTF-8" /><meta name="viewport" content="width=device-width, initial-scale=1.0" /></head>
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
            <p style="margin:0 0 8px;font-size:16px;color:#111827;">Bonjour <strong>${studentName}</strong>,</p>
            <p style="margin:0 0 24px;font-size:14px;color:#6b7280;line-height:1.6;">
              Votre dossier de candidature pour une bourse d'études en Chine a été ouvert. Voici le récapitulatif :
            </p>
            <table width="100%" cellpadding="0" cellspacing="0" style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:8px;margin-bottom:28px;">
              <tr><td style="padding:20px 24px;">
                <table width="100%" cellpadding="0" cellspacing="0">
                  <tr>
                    <td style="padding:6px 0;font-size:13px;color:#6b7280;width:160px;">Université</td>
                    <td style="padding:6px 0;font-size:13px;color:#111827;font-weight:600;">${universityName || "À définir"}</td>
                  </tr>
                  <tr>
                    <td style="padding:6px 0;font-size:13px;color:#6b7280;">Programme souhaité</td>
                    <td style="padding:6px 0;font-size:13px;color:#111827;font-weight:600;">${desiredProgram || "À définir"}</td>
                  </tr>
                  <tr>
                    <td style="padding:6px 0;font-size:13px;color:#6b7280;">Niveau d'études</td>
                    <td style="padding:6px 0;font-size:13px;color:#111827;font-weight:600;">${studyLevel || "À définir"}</td>
                  </tr>
                  <tr>
                    <td style="padding:6px 0;font-size:13px;color:#6b7280;">Type de bourse</td>
                    <td style="padding:6px 0;">
                      <span style="background:#fef2f2;color:#dc2626;font-size:12px;font-weight:600;padding:2px 10px;border-radius:20px;">${scholarshipType || "À définir"}</span>
                    </td>
                  </tr>
                </table>
              </td></tr>
            </table>

            <p style="margin:0 0 12px;font-size:15px;font-weight:700;color:#111827;">📋 Documents à fournir</p>
            <p style="margin:0 0 16px;font-size:13px;color:#6b7280;line-height:1.6;">
              Pour faire avancer votre dossier, veuillez préparer et transmettre les documents suivants :
            </p>
            <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:28px;">
              ${documents.map((doc, i) => `
              <tr>
                <td style="padding:8px 12px;font-size:13px;color:#374151;border-bottom:1px solid #f3f4f6;">
                  <span style="color:#dc2626;font-weight:700;margin-right:8px;">${i + 1}.</span>${doc}
                </td>
              </tr>`).join("")}
            </table>

            <div style="background:#fef2f2;border:1px solid #fecaca;border-radius:8px;padding:16px 20px;margin-bottom:28px;">
              <p style="margin:0;font-size:13px;color:#991b1b;line-height:1.6;">
                ⚠️ <strong>Important :</strong> Tous les documents doivent être en cours de validité et fournis en copie numérique (PDF ou image). Un dossier incomplet ne pourra pas être traité.
              </p>
            </div>

            <table cellpadding="0" cellspacing="0" style="margin-bottom:28px;">
              <tr>
                <td style="background:#dc2626;border-radius:8px;">
                  <a href="${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}"
                     style="display:inline-block;padding:12px 28px;color:#ffffff;font-size:14px;font-weight:600;text-decoration:none;">
                    Accéder à mon espace →
                  </a>
                </td>
              </tr>
            </table>

            <p style="margin:0;font-size:12px;color:#9ca3af;line-height:1.6;">
              Pour toute question, contactez votre conseiller Joda Company.
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

        return NextResponse.json({ success: true });
    } catch (error: any) {
        console.error("Erreur envoi email candidature:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
