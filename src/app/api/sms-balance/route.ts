import { NextRequest, NextResponse } from "next/server";
import { requireAuth, AuthSession } from "@/app/lib/auth";

const SMS_BALANCE_URL = "https://smsvas.com/bulk/public/index.php/api/v1/smscredit";

async function handleSmsBalance(_req: NextRequest, session: AuthSession) {
  try {
    const role = session.user.role;
    if (!["agent", "admin", "super_admin"].includes(role)) {
      return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
    }

    // Sans identifiants, l'API smsvas répond en HTTP 200 mais sans champ `credit` :
    // on remontait alors silencieusement 0. On échoue explicitement à la place.
    if (!process.env.SMS_API_USER || !process.env.SMS_API_PASSWORD) {
      return NextResponse.json(
        { error: "Configuration SMS manquante (SMS_API_USER / SMS_API_PASSWORD)" },
        { status: 500 }
      );
    }

    const res = await fetch(SMS_BALANCE_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({
        user: process.env.SMS_API_USER,
        password: process.env.SMS_API_PASSWORD,
      }),
    });

    const data = await res.json().catch(() => ({} as Record<string, unknown>));

    // smsvas : responsecode 0 = échec (identifiants invalides, etc.). Sans cette
    // vérification, un échec côté provider passait pour un solde de 0.
    if (!res.ok || data.responsecode === 0) {
      const msg =
        (data.responsemessage as string) ||
        (data.responsedescription as string) ||
        "Erreur API SMS";
      return NextResponse.json({ error: msg }, { status: 502 });
    }

    const credit =
      typeof data.credit === "number" ? data.credit : Number(data.credit) || 0;

    return NextResponse.json({
      credit,
      accountExpDate: data.accountexpdate ?? null,
      balanceExpDate: data.balanceexpdate ?? null,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || "Erreur serveur" }, { status: 500 });
  }
}

export const GET = requireAuth(handleSmsBalance);
