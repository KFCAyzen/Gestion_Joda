import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET() {
    try {
        const { data, error } = await supabaseAdmin
            .from("employees")
            .select("id, prenom, nom, poste, departement, suivi_appels, quota_appels")
            .eq("statut", "actif")
            .order("nom", { ascending: true });

        if (error) {
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        return NextResponse.json({ employees: data ?? [] });
    } catch (err: any) {
        return NextResponse.json({ error: err?.message || "Erreur serveur" }, { status: 500 });
    }
}
