import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { requireAuth, AuthSession } from "@/app/lib/auth";
import { sendPaymentResultEmail, getLang } from "@/app/lib/emailService";
import { sendSmsToPhone } from "@/app/lib/smsService";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const PAYMENT_TYPE_LABELS: Record<string, Record<"fr" | "en", string>> = {
  bourse:   { fr: "Procédure Bourse",   en: "Scholarship Procedure" },
  mandarin: { fr: "Cours de Mandarin",  en: "Mandarin Course" },
  anglais:  { fr: "Cours d'Anglais",    en: "English Course" },
};

async function handleNotifyPaymentResult(req: NextRequest, session: AuthSession) {
  const role = session.user.role;
  if (!["admin", "super_admin", "agent", "supervisor"].includes(role)) {
    return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
  }

  try {
    const { studentId, isValid, paymentType, tranche, amount } = await req.json();

    if (!studentId || typeof isValid !== "boolean") {
      return NextResponse.json({ error: "Paramètres manquants" }, { status: 400 });
    }

    const { data: student } = await supabaseAdmin
      .from("students")
      .select("nom, prenom, email, telephone, langue")
      .eq("id", studentId)
      .maybeSingle();

    if (!student) {
      return NextResponse.json({ error: "Étudiant introuvable" }, { status: 404 });
    }

    const lang = getLang(student.langue);
    const isEn = lang === "en";
    const studentName = `${student.prenom ?? ""} ${student.nom ?? ""}`.trim();
    const typeLabelLocale = PAYMENT_TYPE_LABELS[paymentType]?.[lang] ?? paymentType;
    const formattedAmount = new Intl.NumberFormat("fr-FR").format(amount ?? 0);
    const instalment = isEn ? "Instalment" : "Tranche";

    const results = await Promise.allSettled([
      student.email
        ? sendPaymentResultEmail({
            studentName,
            studentEmail: student.email,
            paymentType,
            tranche,
            amount: amount ?? 0,
            isValid,
            lang,
          })
        : Promise.resolve(false),

      student.telephone
        ? sendSmsToPhone(
            student.telephone,
            isValid
              ? isEn
                ? `Hello ${studentName}, your payment ${typeLabelLocale} - ${instalment} ${tranche} (${formattedAmount} FCFA) has been validated. Log in at gestion-joda.vercel.app`
                : `Bonjour ${studentName}, votre paiement ${typeLabelLocale} - Tranche ${tranche} (${formattedAmount} FCFA) a été validé. Connectez-vous sur gestion-joda.vercel.app`
              : isEn
                ? `Hello ${studentName}, your payment ${typeLabelLocale} - ${instalment} ${tranche} could not be validated. Please contact your JODA advisor.`
                : `Bonjour ${studentName}, votre paiement ${typeLabelLocale} - Tranche ${tranche} n'a pas pu être validé. Contactez votre conseiller JODA.`
          )
        : Promise.resolve(false),
    ]);

    const emailOk = results[0].status === "fulfilled" && results[0].value;
    const smsOk = results[1].status === "fulfilled" && results[1].value;

    return NextResponse.json({ success: true, email: emailOk, sms: smsOk });
  } catch (err: any) {
    console.error("[notify-payment-result]", err?.message);
    return NextResponse.json({ error: err?.message || "Erreur serveur" }, { status: 500 });
  }
}

export const POST = requireAuth(handleNotifyPaymentResult);
