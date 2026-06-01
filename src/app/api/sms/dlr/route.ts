import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

// Endpoint Delivery Report NEXAH (cf. doc SMS-API §2.3).
// NEXAH POSTe ici { dlrlist: [...] } pour chaque message envoyé via /api/v1/sendsms.
// Cette URL doit être renseignée côté tableau de bord NEXAH (support smsvas).
// Protégée par un shared secret (SMS_DLR_SECRET) passé en query ou header.

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

// NEXAH renvoie ses horodatages au format "yyyy-MM-dd HH:mm:ss".
// L'heure est exprimée en heure locale Cameroun (UTC+1, pas de DST).
function parseNexahDate(value: unknown): string | null {
  if (!value || typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  // Convertit "2019-05-11 13:53:13" -> "2019-05-11T13:53:13+01:00"
  const iso = trimmed.replace(" ", "T") + "+01:00";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString();
}

interface DlrEntry {
  messageid?: string;
  mobileno?: string;
  status?: string;
  submittime?: string;
  senttime?: string;
  deliverytime?: string;
  reponsecode?: number;
  reponsedescription?: string;
}

function checkSecret(req: NextRequest): boolean {
  const expected = process.env.SMS_DLR_SECRET;
  if (!expected) return false;
  const fromQuery = req.nextUrl.searchParams.get("secret");
  const fromHeader = req.headers.get("x-sms-dlr-secret");
  return fromQuery === expected || fromHeader === expected;
}

export async function POST(req: NextRequest) {
  if (!checkSecret(req)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  let payload: { dlrlist?: DlrEntry[] };
  try {
    payload = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid JSON" }, { status: 400 });
  }

  const list = Array.isArray(payload?.dlrlist) ? payload.dlrlist : [];
  if (list.length === 0) {
    return NextResponse.json({ dlrlist: [] });
  }

  const responseList = await Promise.all(
    list.map(async (entry) => {
      const messageId = entry.messageid?.trim();
      if (!messageId) {
        return { ...entry, status: 0 };
      }

      const upperStatus = (entry.status || "").toUpperCase();
      const finalStatus =
        upperStatus === "DELIVRD"
          ? "delivered"
          : upperStatus === "UNDELIV"
            ? "undelivered"
            : null;

      if (!finalStatus) {
        console.error(`[sms-dlr] statut inconnu pour ${messageId}: "${entry.status}"`);
        return { ...entry, status: 0 };
      }

      const sentTime = parseNexahDate(entry.senttime);
      const deliveryTime = parseNexahDate(entry.deliverytime);

      const update: Record<string, unknown> = { status: finalStatus };
      if (sentTime) update.sent_time = sentTime;
      if (deliveryTime) update.delivery_time = deliveryTime;
      if (finalStatus === "undelivered") {
        update.error_description = entry.reponsedescription || "UNDELIV";
      }

      const { data, error } = await supabaseAdmin
        .from("sms_logs")
        .update(update)
        .eq("message_id", messageId)
        .select("id");

      if (error) {
        console.error(`[sms-dlr] update ${messageId}:`, error.message);
        return { ...entry, status: 0 };
      }

      if (!data || data.length === 0) {
        console.warn(`[sms-dlr] aucun sms_logs.message_id = ${messageId}`);
        return { ...entry, status: 0 };
      }

      return { ...entry, status: 1 };
    }),
  );

  return NextResponse.json({ dlrlist: responseList });
}
