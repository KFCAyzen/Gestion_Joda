const SMS_API_URL = "https://smsvas.com/bulk/public/index.php/api/v1/sendsms";

function normalizePhone(phone: string): string | null {
  const digits = phone.replace(/\D/g, "");
  if (digits.startsWith("237") && digits.length === 12) return digits;
  if (digits.length === 9) return `237${digits}`;
  return null;
}

export async function sendSmsToPhone(phone: string, message: string): Promise<boolean> {
  const normalized = normalizePhone(phone);
  if (!normalized) return false;

  try {
    const res = await fetch(SMS_API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({
        user: process.env.SMS_API_USER!,
        password: process.env.SMS_API_PASSWORD!,
        senderid: process.env.SMS_SENDER_ID || "JodaCompany",
        sms: message,
        mobiles: normalized,
      }),
    });

    const rawText = await res.text();
    let data: Record<string, unknown> = {};
    try { data = JSON.parse(rawText); } catch { /* non-JSON */ }

    if (!res.ok || data.responsecode === 0) {
      console.error("[SMS] Erreur:", data.responsemessage || rawText.slice(0, 200));
      return false;
    }

    console.log(`[SMS] Envoyé à ${normalized}`);
    return true;
  } catch (err) {
    console.error("[SMS] Exception:", err);
    return false;
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
