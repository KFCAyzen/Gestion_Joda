import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { requireAuth, AuthSession } from "@/app/lib/auth";
import { sendPaymentResultEmail } from "@/app/lib/emailService";
import { sendSmsToPhone } from "@/app/lib/smsService";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const PAYMENT_TYPE_LABELS: Record<string, string> = {
  bourse: "Procédure Bourse",
  mandarin: "Cours de Mandarin",
  anglais: "Cours d'Anglais",
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
      .select("nom, prenom, email, telephone")
      .eq("id", studentId)
      .maybeSingle();

    if (!student) {
      return NextResponse.json({ error: "Étudiant introuvable" }, { status: 404 });
    }

    const studentName = `${student.prenom ?? ""} ${student.nom ?? ""}`.trim();
    const typeLabel = PAYMENT_TYPE_LABELS[paymentType] ?? paymentType;
    const formattedAmount = new Intl.NumberFormat("fr-FR").format(amount ?? 0);

    const results = await Promise.allSettled([
      student.email
        ? sendPaymentResultEmail({
            studentName,
            studentEmail: student.email,
            paymentType,
            tranche,
            amount: amount ?? 0,
            isValid,
          })
        : Promise.resolve(false),

      student.telephone
        ? sendSmsToPhone(
            student.telephone,
            isValid
              ? `Bonjour ${studentName}, votre paiement ${typeLabel} - Tranche ${tranche} (${formattedAmount} FCFA) a été validé. Connectez-vous sur gestion-joda.vercel.app`
              : `Bonjour ${studentName}, votre paiement ${typeLabel} - Tranche ${tranche} n'a pas pu être validé. Contactez votre conseiller JODA.`
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
