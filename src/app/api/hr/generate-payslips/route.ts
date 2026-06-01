import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { requireRole, AuthSession } from "@/app/lib/auth";

const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function handle(req: NextRequest, session: AuthSession) {
    try {
        let body: { year?: number; month?: number } = {};
        try {
            body = await req.json();
        } catch {
            // body optionnel
        }
        const target_year =
            typeof body.year === "number" && Number.isFinite(body.year) ? body.year : null;
        const target_month =
            typeof body.month === "number" && body.month >= 1 && body.month <= 12
                ? body.month
                : null;
        const targeted = target_year !== null && target_month !== null;

        const { data, error } = await supabaseAdmin.rpc("hr_generate_due_payslips", {
            target_user: session.user.id,
            target_year: targeted ? target_year : null,
            target_month: targeted ? target_month : null,
        });
        if (error) {
            console.error("[generate-payslips] RPC error:", {
                message: error.message,
                code: error.code,
                details: error.details,
                hint: error.hint,
            });
            return NextResponse.json(
                {
                    error: error.message,
                    code: error.code,
                    details: error.details,
                    hint: error.hint,
                },
                { status: 500 }
            );
        }
        return NextResponse.json({ generated: data ?? [] });
    } catch (err: any) {
        console.error("[generate-payslips] Unexpected error:", err);
        return NextResponse.json({ error: err?.message || "Erreur serveur" }, { status: 500 });
    }
}

export const POST = requireRole(["supervisor", "admin", "super_admin"], handle);
