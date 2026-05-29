import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { requireRole, AuthSession } from "@/app/lib/auth";

const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function handle(req: NextRequest, _session: AuthSession) {
    try {
        const id = req.nextUrl.pathname.split("/").filter(Boolean).at(-2);
        if (!id) {
            return NextResponse.json({ error: "ID employé manquant" }, { status: 400 });
        }

        const { data: plain, error } = await supabaseAdmin.rpc("hr_regenerate_report_pin", {
            emp_id: id,
        });

        if (error) {
            return NextResponse.json({ error: error.message }, { status: 500 });
        }
        if (!plain) {
            return NextResponse.json({ error: "Employé introuvable" }, { status: 404 });
        }

        return NextResponse.json({ employee: { id, report_pin: plain } });
    } catch (err: any) {
        return NextResponse.json({ error: err?.message || "Erreur serveur" }, { status: 500 });
    }
}

export const POST = requireRole(["supervisor", "admin", "super_admin"], handle);
