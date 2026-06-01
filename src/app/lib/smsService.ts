import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const SMS_API_URL = "https://smsvas.com/bulk/public/index.php/api/v1/sendsms";
const SMS_TIMEOUT_MS = 15_000;

let _supabaseAdmin: SupabaseClient | null = null;
function getSupabaseAdmin(): SupabaseClient | null {
  if (_supabaseAdmin) return _supabaseAdmin;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  _supabaseAdmin = createClient(url, key, { auth: { persistSession: false } });
  return _supabaseAdmin;
}

function normalizePhone(phone: string): string | null {
  const trimmed = (phone || "").trim();
  if (!trimmed) return null;
  const digits = trimmed.replace(/\D/g, "");
  if (trimmed.startsWith("+") && digits.length >= 8) return digits;
  if (digits.length === 9) return `237${digits}`;
  if (digits.startsWith("237") && digits.length === 12) return digits;
  if (digits.length >= 8) return digits;
  return null;
}

export interface SmsDelivery {
  mobile: string;
  messageId: string | null;
  smsClientId: string | null;
  status: "success" | "error";
  errorCode?: string;
  errorDescription?: string;
}

function parseDeliveries(data: unknown): SmsDelivery[] {
  const arr = (data as { sms?: unknown })?.sms;
  if (!Array.isArray(arr)) return [];
  return arr.map((s: Record<string, unknown>) => ({
    mobile: String(s.mobileno ?? "").replace(/^\+/, ""),
    messageId: (s.messageid as string) || null,
    smsClientId: (s.smsclientid as string) || null,
    status: s.status === "success" ? "success" : "error",
    errorCode: (s.errorcode as string) || undefined,
    errorDescription: (s.errordescription as string) || undefined,
  }));
}

function findDeliveryFor(mobile: string, deliveries: SmsDelivery[]): SmsDelivery | undefined {
  const tail = mobile.slice(-9);
  return deliveries.find((d) => d.mobile.endsWith(tail));
}

export async function logSmsBatch(
  senderId: string,
  body: string,
  recipients: string[],
  deliveries: SmsDelivery[],
  fallbackError?: string,
): Promise<void> {
  const supa = getSupabaseAdmin();
  if (!supa) return;
  try {
    const rows = recipients.map((mobile) => {
      const d = findDeliveryFor(mobile, deliveries);
      const status = d
        ? d.status === "success"
          ? "sent"
          : "failed"
        : fallbackError
          ? "failed"
          : "pending";
      return {
        message_id: d?.messageId ?? null,
        sms_client_id: d?.smsClientId ?? null,
        recipient: mobile,
        sender_id: senderId,
        body,
        status,
        error_code: d?.errorCode ?? null,
        error_description: d?.errorDescription ?? fallbackError ?? null,
      };
    });
    const { error } = await supa.from("sms_logs").insert(rows);
    if (error) console.error("[SMS] insert sms_logs:", error.message);
  } catch (err) {
    console.error("[SMS] logSmsBatch exception:", err);
  }
}

export async function sendSmsToPhone(
  phone: string,
  message: string,
): Promise<{ ok: boolean; error?: string; messageId?: string }> {
  const normalized = normalizePhone(phone);
  if (!normalized) {
    console.error(`[SMS] Numéro non normalisable : "${phone}"`);
    return { ok: false, error: `phone "${phone}" not in Cameroon format` };
  }
  if (!process.env.SMS_API_USER || !process.env.SMS_API_PASSWORD) {
    console.error("[SMS] SMS_API_USER ou SMS_API_PASSWORD manquant");
    return { ok: false, error: "SMS_API_USER/SMS_API_PASSWORD missing" };
  }

  const senderId = process.env.SMS_SENDER_ID || "JODACOMPANY";

  try {
    const res = await fetch(SMS_API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({
        user: process.env.SMS_API_USER,
        password: process.env.SMS_API_PASSWORD,
        senderid: senderId,
        sms: message,
        mobiles: normalized,
      }),
      signal: AbortSignal.timeout(SMS_TIMEOUT_MS),
    });

    const rawText = await res.text();
    let data: Record<string, unknown> = {};
    try { data = JSON.parse(rawText); } catch { /* non-JSON */ }

    if (!res.ok || data.responsecode === 0) {
      const errMsg = (data.responsemessage as string) || rawText.slice(0, 200);
      console.error("[SMS] Erreur NEXAH:", errMsg);
      logSmsBatch(senderId, message, [normalized], [], errMsg).catch(() => {});
      return { ok: false, error: errMsg };
    }

    const deliveries = parseDeliveries(data);
    logSmsBatch(senderId, message, [normalized], deliveries).catch(() => {});

    const own = findDeliveryFor(normalized, deliveries);
    if (!own || own.status !== "success") {
      const errMsg = own?.errorDescription || "unknown per-recipient error";
      console.error(`[SMS] Échec destinataire ${normalized}:`, errMsg);
      return { ok: false, error: errMsg };
    }

    console.log(`[SMS] Envoyé à ${normalized} (msgId=${own.messageId ?? "?"})`);
    return { ok: true, messageId: own.messageId ?? undefined };
  } catch (err: unknown) {
    const isTimeout = (err as { name?: string })?.name === "TimeoutError" || (err as { name?: string })?.name === "AbortError";
    const errMsg = isTimeout
      ? `Timeout NEXAH (>${SMS_TIMEOUT_MS}ms)`
      : (err as { message?: string })?.message || String(err);
    console.error("[SMS] Exception:", errMsg);
    logSmsBatch(senderId, message, [normalized], [], errMsg).catch(() => {});
    return { ok: false, error: errMsg };
  }
}

export async function sendSmsToPhones(
  phones: string[],
  message: string,
): Promise<{ success: boolean; sent: number; deliveries: SmsDelivery[] }> {
  const validPhones = phones.map(normalizePhone).filter(Boolean) as string[];
  if (validPhones.length === 0) return { success: false, sent: 0, deliveries: [] };

  const senderId = process.env.SMS_SENDER_ID || "JODACOMPANY";

  try {
    const res = await fetch(SMS_API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({
        user: process.env.SMS_API_USER!,
        password: process.env.SMS_API_PASSWORD!,
        senderid: senderId,
        sms: message,
        mobiles: validPhones.join(","),
      }),
      signal: AbortSignal.timeout(SMS_TIMEOUT_MS),
    });

    const rawText = await res.text();
    let data: Record<string, unknown> = {};
    try { data = JSON.parse(rawText); } catch { /* non-JSON */ }

    if (!res.ok || data.responsecode === 0) {
      const errMsg = (data.responsemessage as string) || rawText.slice(0, 200);
      console.error("[SMS] Erreur NEXAH:", errMsg);
      logSmsBatch(senderId, message, validPhones, [], errMsg).catch(() => {});
      return { success: false, sent: 0, deliveries: [] };
    }

    const deliveries = parseDeliveries(data);
    logSmsBatch(senderId, message, validPhones, deliveries).catch(() => {});

    const sent = deliveries.filter((d) => d.status === "success").length;
    console.log(`[SMS] Envoyé à ${sent}/${validPhones.length} destinataires`);
    return { success: true, sent, deliveries };
  } catch (err: unknown) {
    const isTimeout = (err as { name?: string })?.name === "TimeoutError" || (err as { name?: string })?.name === "AbortError";
    const errMsg = isTimeout
      ? `Timeout NEXAH (>${SMS_TIMEOUT_MS}ms)`
      : (err as { message?: string })?.message || String(err);
    console.error("[SMS] Exception:", errMsg);
    logSmsBatch(senderId, message, validPhones, [], errMsg).catch(() => {});
    return { success: false, sent: 0, deliveries: [] };
  }
}
