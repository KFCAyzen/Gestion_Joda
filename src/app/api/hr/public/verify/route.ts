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

        const { data: ok, error: verifyError } = await supabaseAdmin.rpc("hr_verify_report_pin", {
            emp_id: employee_id,
            plain: pin,
        });

        if (verifyError) {
            return NextResponse.json({ error: verifyError.message }, { status: 500 });
        }
        if (!ok) {
            return NextResponse.json({ error: "Identifiants invalides" }, { status: 401 });
        }

        const { data: emp, error: empError } = await supabaseAdmin
            .from("employees")
            .select("id, prenom, nom, poste")
            .eq("id", employee_id)
            .maybeSingle();

        if (empError || !emp) {
            return NextResponse.json({ error: empError?.message || "Employé introuvable" }, { status: 500 });
        }

        return NextResponse.json({ employee: emp });
    } catch (err: any) {
        return NextResponse.json({ error: err?.message || "Erreur serveur" }, { status: 500 });
    }
}
