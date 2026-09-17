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
            .is("archived_at", null)
            .order("nom", { ascending: true })
            // Borné : sans cela une base lente laissait la fonction (et le
            // client) suspendus, liste des employés jamais affichée.
            .abortSignal(AbortSignal.timeout(15_000));

        if (error) {
            console.error("[rapport/employees] erreur:", error.message);
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        return NextResponse.json(
            { employees: data ?? [] },
            { headers: { "Cache-Control": "no-store" } }
        );
    } catch (err: any) {
        return NextResponse.json({ error: err?.message || "Erreur serveur" }, { status: 500 });
    }
}
