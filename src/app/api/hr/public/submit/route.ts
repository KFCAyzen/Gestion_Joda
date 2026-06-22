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
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    activites: z.string().min(1).max(5000),
    heures_travaillees: z.number().min(0).max(24),
    observations: z.string().max(2000).nullable().optional(),
    nb_appels: z.number().int().min(0).max(100000).optional(),
    nb_rdv_confirmes: z.number().int().min(0).max(100000).optional(),
    nb_relances: z.number().int().min(0).max(100000).optional(),
    nb_indisponibles: z.number().int().min(0).max(100000).optional(),
    nb_rejets: z.number().int().min(0).max(100000).optional(),
    nb_autres: z.number().int().min(0).max(100000).optional(),
});

export async function POST(req: NextRequest) {
    try {
        const parsed = bodySchema.safeParse(await req.json());
        if (!parsed.success) {
            return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Paramètres invalides" }, { status: 400 });
        }
        const {
            employee_id,
            pin,
            date,
            activites,
            heures_travaillees,
            observations,
            nb_appels,
            nb_rdv_confirmes,
            nb_relances,
            nb_indisponibles,
            nb_rejets,
            nb_autres,
        } = parsed.data;

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

        const { data: report, error: insertError } = await supabaseAdmin
            .from("daily_reports")
            .insert({
                employee_id,
                date,
                activites: activites.trim(),
                heures_travaillees,
                observations: observations?.trim() || null,
                nb_appels: nb_appels ?? 0,
                nb_rdv_confirmes: nb_rdv_confirmes ?? 0,
                nb_relances: nb_relances ?? 0,
                nb_indisponibles: nb_indisponibles ?? 0,
                nb_rejets: nb_rejets ?? 0,
                nb_autres: nb_autres ?? 0,
                created_by: null,
            })
            .select()
            .single();

        if (insertError) {
            return NextResponse.json({ error: insertError.message }, { status: 500 });
        }

        return NextResponse.json({ report });
    } catch (err: any) {
        return NextResponse.json({ error: err?.message || "Erreur serveur" }, { status: 500 });
    }
}
