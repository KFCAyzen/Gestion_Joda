import { NextRequest, NextResponse } from "next/server";
import { requireAuth, AuthSession } from "@/app/lib/auth";

const SMS_BALANCE_URL = "https://smsvas.com/bulk/public/index.php/api/v1/smscredit";

async function handleSmsBalance(_req: NextRequest, session: AuthSession) {
  try {
    const role = session.user.role;
    if (!["agent", "admin", "super_admin"].includes(role)) {
      return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
    }

    const res = await fetch(SMS_BALANCE_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({
        user: process.env.SMS_API_USER!,
        password: process.env.SMS_API_PASSWORD!,
      }),
    });

    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      return NextResponse.json({ error: "Erreur API SMS" }, { status: 502 });
    }

    return NextResponse.json({
      credit: data.credit ?? 0,
      accountExpDate: data.accountexpdate ?? null,
      balanceExpDate: data.balanceexpdate ?? null,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || "Erreur serveur" }, { status: 500 });
  }
}

export const GET = requireAuth(handleSmsBalance);
