import { NextRequest, NextResponse } from "next/server";
import { requireRole, AuthSession } from "@/app/lib/auth";
import { sendPayslipEmail, getLang } from "@/app/lib/emailService";

async function handle(req: NextRequest, _session: AuthSession) {
    try {
        const body = await req.json();
        const {
            to,
            employeeName,
            mois,
            annee,
            reference,
            netAPayer,
            pdfBase64,
            langue,
        } = body ?? {};

        if (!to || typeof to !== "string") {
            return NextResponse.json({ error: "Email destinataire manquant" }, { status: 400 });
        }
        if (!pdfBase64 || typeof pdfBase64 !== "string") {
            return NextResponse.json({ error: "PDF manquant" }, { status: 400 });
        }

        const result = await sendPayslipEmail({
            employeeName: String(employeeName ?? "").trim() || "Collaborateur",
            employeeEmail: to.trim(),
            mois: Number(mois) || 1,
            annee: Number(annee) || new Date().getFullYear(),
            reference: String(reference ?? "").trim(),
            netAPayer: Number(netAPayer) || 0,
            pdfBase64,
            lang: getLang(langue),
        });

        if (!result.ok) {
            return NextResponse.json({ error: result.error || "Échec de l'envoi" }, { status: 502 });
        }
        return NextResponse.json({ ok: true });
    } catch (err: any) {
        console.error("[send-payslip] Erreur:", err);
        return NextResponse.json({ error: err?.message || "Erreur serveur" }, { status: 500 });
    }
}

export const POST = requireRole(["supervisor", "admin", "super_admin"], handle);
