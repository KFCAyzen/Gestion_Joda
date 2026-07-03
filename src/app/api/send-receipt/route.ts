import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";
import { requireRole, AuthSession } from "@/app/lib/auth";
import { getLang, sendReceiptEmail } from "@/app/lib/emailService";

// Le PDF du reçu est généré côté client (rendu identique au téléchargement) puis
// transmis en base64. Cette route l'envoie par mail à l'étudiant. Le destinataire
// est TOUJOURS ré-résolu côté serveur depuis studentId (jamais fourni par le
// client) → impossible d'expédier un reçu à une adresse arbitraire.
const bodySchema = z.object({
    studentId: z.string().uuid(),
    receiptNo: z.string().min(1).max(32),
    amountLabel: z.string().min(1).max(64),
    prestationLabel: z.string().min(1).max(160),
    dateStr: z.string().min(1).max(40),
    pdfBase64: z.string().min(1).max(6_000_000), // ~4.5 Mo de PDF max
});

const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function handleSendReceipt(req: NextRequest, _session: AuthSession) {
    const parsed = bodySchema.safeParse(await req.json());
    if (!parsed.success) {
        return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Paramètres invalides" }, { status: 400 });
    }
    const { studentId, receiptNo, amountLabel, prestationLabel, dateStr, pdfBase64 } = parsed.data;

    const { data: student, error } = await supabaseAdmin
        .from("students")
        .select("nom, prenom, email, langue")
        .eq("id", studentId)
        .maybeSingle();

    if (error) {
        console.error("[send-receipt] lecture étudiant:", error.message);
        return NextResponse.json({ error: "Erreur lecture étudiant" }, { status: 500 });
    }
    if (!student) {
        return NextResponse.json({ error: "Étudiant introuvable" }, { status: 404 });
    }
    if (!student.email) {
        return NextResponse.json({ error: "L'étudiant n'a pas d'email de contact" }, { status: 422 });
    }

    const res = await sendReceiptEmail({
        studentName: `${student.nom} ${student.prenom}`,
        studentEmail: student.email,
        receiptNo,
        amountLabel,
        prestationLabel,
        dateStr,
        pdfBase64,
        lang: getLang(student.langue),
    });

    if (!res.ok) {
        return NextResponse.json({ error: res.error ?? "Envoi impossible" }, { status: 502 });
    }
    return NextResponse.json({ success: true });
}

export const POST = requireRole(['agent', 'supervisor', 'admin', 'super_admin'], handleSendReceipt);
