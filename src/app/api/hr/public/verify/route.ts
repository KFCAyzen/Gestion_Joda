import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";

const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const bodySchema = z.object({
    employee_id: z.string().uuid(),
    pin: z.string().min(4).max(12),
});

export async function POST(req: NextRequest) {
    try {
        const parsed = bodySchema.safeParse(await req.json());
        if (!parsed.success) {
            return NextResponse.json({ error: "Paramètres invalides" }, { status: 400 });
        }
        const { employee_id, pin } = parsed.data;

        const { data: ok, error: verifyError } = await supabaseAdmin
            .rpc("hr_verify_report_pin", { emp_id: employee_id, plain: pin })
            .abortSignal(AbortSignal.timeout(15_000));

        if (verifyError) {
            console.error("[rapport/verify] rpc error:", verifyError.message, "employee:", employee_id);
            return NextResponse.json({ error: "Vérification impossible pour le moment, réessayez." }, { status: 500 });
        }
        if (!ok) {
            // La RPC ne renvoie qu'un booléen : on qualifie le refus côté logs
            // (jamais côté client) pour distinguer un vrai PIN faux d'un compte
            // qui n'a plus de PIN / n'est plus actif / a été archivé.
            const { data: why } = await supabaseAdmin
                .from("employees")
                .select("statut, archived_at, report_pin")
                .eq("id", employee_id)
                .maybeSingle();
            const reason = !why
                ? "employe_introuvable"
                : why.archived_at
                    ? "archive"
                    : why.statut !== "actif"
                        ? `statut=${why.statut}`
                        : !why.report_pin
                            ? "pin_absent"
                            : "pin_incorrect";
            console.warn("[rapport/verify] refus:", reason, "employee:", employee_id);
            return NextResponse.json({ error: "Identifiants invalides" }, { status: 401 });
        }

        const { data: emp, error: empError } = await supabaseAdmin
            .from("employees")
            .select("id, prenom, nom, poste, departement, suivi_appels, quota_appels")
            .eq("id", employee_id)
            .is("archived_at", null)
            .maybeSingle();

        if (empError || !emp) {
            return NextResponse.json({ error: empError?.message || "Employé introuvable" }, { status: 500 });
        }

        return NextResponse.json({ employee: emp });
    } catch (err: any) {
        return NextResponse.json({ error: err?.message || "Erreur serveur" }, { status: 500 });
    }
}
