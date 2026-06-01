import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";
import { requireAuth, AuthSession } from "@/app/lib/auth";
import { sendSmsToPhones } from "@/app/lib/smsService";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const sendSmsBodySchema = z.object({
  studentIds: z.array(z.string()).min(1),
  message: z.string().min(1).max(500),
});

function hasValidPhone(phone: string | null | undefined): boolean {
  if (!phone) return false;
  const digits = phone.replace(/\D/g, "");
  return digits.length >= 8;
}

async function handleSendSms(req: NextRequest, session: AuthSession) {
  try {
    const role = session.user.role;
    if (!["agent", "admin", "super_admin"].includes(role)) {
      return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
    }

    const parsed = sendSmsBodySchema.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Paramètres invalides" }, { status: 400 });
    }
    const { studentIds, message } = parsed.data;

    const { data: students, error: studentsErr } = await supabaseAdmin
      .from("students")
      .select("id, nom, prenom, telephone")
      .in("id", studentIds);

    if (studentsErr) {
      return NextResponse.json({ error: studentsErr.message }, { status: 500 });
    }

    const phones = (students ?? [])
      .filter((s) => hasValidPhone(s.telephone))
      .map((s) => s.telephone as string);

    if (phones.length === 0) {
      return NextResponse.json(
        { error: "Aucun étudiant valide avec numéro de téléphone" },
        { status: 400 }
      );
    }

    const result = await sendSmsToPhones(phones, message.trim());

    if (!result.success) {
      return NextResponse.json({ error: "Échec d'envoi NEXAH" }, { status: 502 });
    }

    return NextResponse.json({
      success: true,
      sent: result.sent,
      total: phones.length,
      skipped: studentIds.length - phones.length,
      details: result.deliveries,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || "Erreur serveur" }, { status: 500 });
  }
}

export const POST = requireAuth(handleSendSms);
