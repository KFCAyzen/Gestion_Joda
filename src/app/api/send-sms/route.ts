import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { requireAuth, AuthSession } from "@/app/lib/auth";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const SMS_API_URL = "https://smsvas.com/bulk/public/index.php/api/v1/sendsms";

function normalizePhone(phone: string): string | null {
  const digits = phone.replace(/\D/g, "");
  if (digits.startsWith("237") && digits.length === 12) return digits;
  if (digits.length === 9) return `237${digits}`;
  return null;
}

async function handleSendSms(req: NextRequest, session: AuthSession) {
  try {
    const role = session.user.role;
    if (!["agent", "admin", "super_admin"].includes(role)) {
      return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
    }

    const { studentIds, message } = await req.json();

    if (!Array.isArray(studentIds) || studentIds.length === 0) {
      return NextResponse.json({ error: "studentIds manquant" }, { status: 400 });
    }
    if (!message?.trim()) {
      return NextResponse.json({ error: "message manquant" }, { status: 400 });
    }

    const { data: students, error: studentsErr } = await supabaseAdmin
      .from("students")
      .select("id, nom, prenom, telephone")
      .in("id", studentIds);

    if (studentsErr) {
      return NextResponse.json({ error: studentsErr.message }, { status: 500 });
    }

    const validStudents = (students ?? []).filter((s) => {
      const phone = normalizePhone(s.telephone ?? "");
      return !!phone;
    });

    if (validStudents.length === 0) {
      return NextResponse.json(
        { error: "Aucun étudiant valide avec numéro de téléphone" },
        { status: 400 }
      );
    }

    const mobiles = validStudents
      .map((s) => normalizePhone(s.telephone)!)
      .join(",");

    const smsPayload = {
      user: process.env.SMS_API_USER!,
      password: process.env.SMS_API_PASSWORD!,
      senderid: process.env.SMS_SENDER_ID || "JODA",
      sms: message.trim(),
      mobiles,
    };

    const smsRes = await fetch(SMS_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(smsPayload),
    });

    const smsData = await smsRes.json().catch(() => ({}));

    if (!smsRes.ok || smsData.responsecode === 0) {
      const errMsg = smsData.responsemessage || smsData.errordescription || "Erreur SMS";
      return NextResponse.json({ error: errMsg }, { status: 502 });
    }

    const deliveredCount = Array.isArray(smsData.sms)
      ? smsData.sms.filter((s: { status: string }) => s.status === "success").length
      : validStudents.length;

    return NextResponse.json({
      success: true,
      sent: deliveredCount,
      total: validStudents.length,
      skipped: studentIds.length - validStudents.length,
      details: smsData.sms ?? [],
    });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || "Erreur serveur" }, { status: 500 });
  }
}

export const POST = requireAuth(handleSendSms);
