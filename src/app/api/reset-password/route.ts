import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { requireRole } from "@/app/lib/auth";

const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function handleResetPassword(req: NextRequest) {
    try {
        const { email } = await req.json();

        if (!email) {
            return NextResponse.json({ error: "Email manquant" }, { status: 400 });
        }

        // Générer un lien de reset sécurisé
        const { data, error } = await supabaseAdmin.auth.admin.generateLink({
            type: 'recovery',
            email,
        });

        if (error) {
            console.error("[reset-password] error:", error.message);
            return NextResponse.json({ error: error.message }, { status: 400 });
        }

        // TODO: Envoyer l'email avec le lien data.properties.action_link
        // Pour l'instant, on retourne le lien (à supprimer en prod)
        return NextResponse.json({ 
            success: true, 
            resetLink: data.properties.action_link 
        });
    } catch (err: any) {
        console.error("[reset-password] Unexpected error:", err?.message || err);
        return NextResponse.json({ error: err?.message || "Erreur serveur" }, { status: 500 });
    }
}

export const POST = requireRole(['admin', 'super_admin'], handleResetPassword);
