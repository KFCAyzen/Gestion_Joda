import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";
import { requireAuth, AuthSession } from "@/app/lib/auth";
import { sendPaymentResultEmail, getLang } from "@/app/lib/emailService";
import { sendSmsToPhone } from "@/app/lib/smsService";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const notifyPaymentResultBodySchema = z.object({
  studentId: z.string().min(1),
  isValid: z.boolean(),
  paymentType: z.enum(["bourse", "mandarin", "anglais", "inscription", "autre"]),
  tranche: z.number().int().min(1).optional(),
  amount: z.number().nonnegative().optional().nullable(),
  rejectionReason: z.string().optional().nullable(),
});

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
    const parsed = notifyPaymentResultBodySchema.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Paramètres invalides" }, { status: 400 });
    }
    const { studentId, isValid, paymentType, tranche, amount, rejectionReason } = parsed.data;

    const { data: student } = await supabaseAdmin
      .from("students")
      .select("nom, prenom, email, telephone, langue, user_id")
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

    const notifTitle = isValid
      ? (isEn ? "Payment validated" : "Paiement validé")
      : (isEn ? "Payment rejected" : "Paiement rejeté");

    const notifMessage = isValid
      ? (isEn
          ? `Your payment ${typeLabelLocale} - ${instalment} ${tranche} (${formattedAmount} FCFA) has been validated.`
          : `Votre paiement ${typeLabelLocale} - Tranche ${tranche} (${formattedAmount} FCFA) a été validé.`)
      : (isEn
          ? `Your payment ${typeLabelLocale} - ${instalment} ${tranche} could not be validated.${rejectionReason ? ` Reason: ${rejectionReason}` : ""}`
          : `Votre paiement ${typeLabelLocale} - Tranche ${tranche} n'a pas pu être validé.${rejectionReason ? ` Motif : ${rejectionReason}` : ""}`);

    const inAppTasks: PromiseLike<unknown>[] = [];

    if (student.user_id) {
      inAppTasks.push(
        supabaseAdmin.from("notifications").insert({
          user_id: student.user_id,
          type: isValid ? "paiement_valide" : "paiement_rejete",
          titre: notifTitle,
          message: notifMessage,
          read: false,
        })
      );

      const msgSubject = isValid
        ? (isEn ? `Payment validated — ${typeLabelLocale} ${instalment} ${tranche}` : `Paiement validé — ${typeLabelLocale} Tranche ${tranche}`)
        : (isEn ? `Payment rejected — ${typeLabelLocale} ${instalment} ${tranche}` : `Paiement rejeté — ${typeLabelLocale} Tranche ${tranche}`);

      const msgContent = isValid
        ? (isEn
            ? `Hello ${studentName},\n\nYour payment ${typeLabelLocale} - ${instalment} ${tranche} (${formattedAmount} FCFA) has been successfully validated by the Joda Company team.\n\nYou can view your updated file in your student space.`
            : `Bonjour ${studentName},\n\nVotre paiement ${typeLabelLocale} - Tranche ${tranche} (${formattedAmount} FCFA) a bien été validé par l'équipe Joda Company.\n\nVous pouvez consulter votre dossier mis à jour dans votre espace étudiant.`)
        : (isEn
            ? `Hello ${studentName},\n\nUnfortunately, your payment ${typeLabelLocale} - ${instalment} ${tranche} (${formattedAmount} FCFA) could not be validated.${rejectionReason ? `\n\nReason: ${rejectionReason}` : ""}\n\nPlease contact your Joda Company advisor to resubmit your proof of payment.`
            : `Bonjour ${studentName},\n\nVotre paiement ${typeLabelLocale} - Tranche ${tranche} (${formattedAmount} FCFA) n'a malheureusement pas pu être validé.${rejectionReason ? `\n\nMotif : ${rejectionReason}` : ""}\n\nVeuillez contacter votre conseiller Joda Company pour soumettre à nouveau votre justificatif.`);

      inAppTasks.push(
        supabaseAdmin.from("messages").insert({
          from_user_id: session.user.id,
          to_user_id: student.user_id,
          subject: msgSubject,
          content: msgContent,
          read: false,
        })
      );
    }

    const results = await Promise.allSettled([
      student.email
        ? sendPaymentResultEmail({
            studentName,
            studentEmail: student.email,
            paymentType,
            tranche: tranche ?? 0,
            amount: amount ?? 0,
            isValid,
            rejectionReason: rejectionReason ?? undefined,
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

      ...inAppTasks,
    ]);

    const emailOk = results[0].status === "fulfilled" && results[0].value;
    const smsOk = results[1].status === "fulfilled" && results[1].value;

    // Les tâches in-app (notif + message) suivent email/sms dans `results`. On ne
    // les avalait pas : un insert PostgREST « fulfilled » peut porter une `error`
    // dans sa valeur (il ne throw pas), et une promesse peut être rejetée. On
    // inspecte les deux et on logge — sinon une notif/message perdu reste invisible.
    let inAppOk = true;
    for (let i = 2; i < results.length; i++) {
      const r = results[i];
      if (r.status === "rejected") {
        inAppOk = false;
        console.error("[notify-payment-result] in-app task rejected:", r.reason?.message ?? r.reason);
      } else if (r.value && typeof r.value === "object" && "error" in r.value && (r.value as { error: unknown }).error) {
        inAppOk = false;
        console.error("[notify-payment-result] in-app insert error:", (r.value as { error: { message?: string } }).error?.message);
      }
    }

    return NextResponse.json({ success: true, email: emailOk, sms: smsOk, inApp: inAppOk });
  } catch (err: any) {
    console.error("[notify-payment-result]", err?.message);
    return NextResponse.json({ error: err?.message || "Erreur serveur" }, { status: 500 });
  }
}

export const POST = requireAuth(handleNotifyPaymentResult);
