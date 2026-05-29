const SMS_API_URL = "https://smsvas.com/bulk/public/index.php/api/v1/sendsms";

function normalizePhone(phone: string): string | null {
  const trimmed = (phone || "").trim();
  if (!trimmed) return null;
  const digits = trimmed.replace(/\D/g, "");
  // Numéro international déjà préfixé (+33 6..., +237 6..., etc.)
  if (trimmed.startsWith("+") && digits.length >= 8) return digits;
  // Format Cameroun historique (9 chiffres locaux)
  if (digits.length === 9) return `237${digits}`;
  // Format Cameroun déjà normalisé
  if (digits.startsWith("237") && digits.length === 12) return digits;
  // Fallback : si on a au moins 8 chiffres, on tente l'envoi en l'état
  if (digits.length >= 8) return digits;
  return null;
}

export async function sendSmsToPhone(phone: string, message: string): Promise<{ ok: boolean; error?: string }> {
  const normalized = normalizePhone(phone);
  if (!normalized) {
    console.error(`[SMS] Numéro non normalisable (attendu format Cameroun) : "${phone}"`);
    return { ok: false, error: `phone "${phone}" not in Cameroon format (237XXXXXXXXX or 9 digits)` };
  }
  if (!process.env.SMS_API_USER || !process.env.SMS_API_PASSWORD) {
    console.error("[SMS] SMS_API_USER ou SMS_API_PASSWORD manquant");
    return { ok: false, error: "SMS_API_USER/SMS_API_PASSWORD missing" };
  }

  try {
    const res = await fetch(SMS_API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({
        user: process.env.SMS_API_USER,
        password: process.env.SMS_API_PASSWORD,
        senderid: process.env.SMS_SENDER_ID || "JodaCompany",
        sms: message,
        mobiles: normalized,
      }),
    });

    const rawText = await res.text();
    let data: Record<string, unknown> = {};
    try { data = JSON.parse(rawText); } catch { /* non-JSON */ }

    if (!res.ok || data.responsecode === 0) {
      const errMsg = (data.responsemessage as string) || rawText.slice(0, 200);
      console.error("[SMS] Erreur:", errMsg);
      return { ok: false, error: errMsg };
    }

    console.log(`[SMS] Envoyé à ${normalized}`);
    return { ok: true };
  } catch (err: any) {
    console.error("[SMS] Exception:", err);
    return { ok: false, error: err?.message || String(err) };
  }
}

export async function sendSmsToPhones(
  phones: string[],
  message: string
): Promise<{ success: boolean; sent: number }> {
  const validPhones = phones.map(normalizePhone).filter(Boolean) as string[];
  if (validPhones.length === 0) return { success: false, sent: 0 };

  try {
    const res = await fetch(SMS_API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({
        user: process.env.SMS_API_USER!,
        password: process.env.SMS_API_PASSWORD!,
        senderid: process.env.SMS_SENDER_ID || "JodaCompany",
        sms: message,
        mobiles: validPhones.join(","),
      }),
    });

    const rawText = await res.text();
    let data: Record<string, unknown> = {};
    try { data = JSON.parse(rawText); } catch { /* non-JSON */ }

    if (!res.ok || data.responsecode === 0) {
      console.error("[SMS] Erreur:", data.responsemessage || rawText.slice(0, 200));
      return { success: false, sent: 0 };
    }

    const sent = Array.isArray(data.sms)
      ? data.sms.filter((s: { status: string }) => s.status === "success").length
      : validPhones.length;

    console.log(`[SMS] Envoyé à ${sent}/${validPhones.length} destinataires`);
    return { success: true, sent };
  } catch (err) {
    console.error("[SMS] Exception:", err);
    return { success: false, sent: 0 };
  }
}
