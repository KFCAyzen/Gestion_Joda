import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { requireRole, AuthSession } from "@/app/lib/auth";

const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function handleDeleteUser(req: NextRequest, session: AuthSession) {
    try {
        const { userId } = await req.json();

        if (!userId) {
            return NextResponse.json({ error: "userId manquant" }, { status: 400 });
        }

        // Vérifier le rôle de la cible pour éviter qu'un admin supprime un autre admin
        if (session.user.role === "admin") {
            const { data: target } = await supabaseAdmin
                .from("users")
                .select("role")
                .eq("id", userId)
                .maybeSingle();
            if (!target || !["student", "agent", "user"].includes(target.role)) {
                return NextResponse.json({ error: "Permission insuffisante" }, { status: 403 });
            }
        }

        // Supprimer de Supabase Auth (cascade sur la table users si FK configurée)
        const { error: authError } = await supabaseAdmin.auth.admin.deleteUser(userId);
        if (authError) {
            console.error("[delete-user] authError:", authError.message);
            return NextResponse.json({ error: authError.message }, { status: 400 });
        }

        // Supprimer de la table users (au cas où pas de cascade)
        const { error: dbError } = await supabaseAdmin.from("users").delete().eq("id", userId);
        if (dbError) {
            console.error("[delete-user] dbError:", dbError.message);
            return NextResponse.json({ error: dbError.message }, { status: 500 });
        }

        return NextResponse.json({ success: true });
    } catch (err: any) {
        console.error("[delete-user] Unexpected error:", err?.message || err);
        return NextResponse.json({ error: err?.message || "Erreur serveur" }, { status: 500 });
    }
}

export const DELETE = requireRole(['admin', 'super_admin'], handleDeleteUser);
