import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";
import { requireRole, AuthSession } from "@/app/lib/auth";

const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const deleteUserBodySchema = z.object({ userId: z.string().min(1) });

/**
 * Transforme l'erreur brute de FK Postgres
 *   « update or delete on table "users" violates foreign key constraint
 *     "messages_to_user_id_fkey" on table "messages" »
 * en message lisible qui nomme la table qui retient le compte.
 */
function fkErrorMessage(raw: string | undefined): string {
    const table = raw ? /on table "([^"]+)"\s*$/.exec(raw)?.[1] : undefined;
    const where = table ? ` (table « ${table} »)` : "";
    return `Ce compte est encore référencé par des données${where} et ne peut pas être supprimé. ` +
        `Appliquez la migration fix_user_delete_fk_actions.sql, ou désactivez le compte à la place.`;
}

async function handleDeleteUser(req: NextRequest, session: AuthSession) {
    try {
        const parsed = deleteUserBodySchema.safeParse(await req.json());
        if (!parsed.success) {
            return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Paramètres invalides" }, { status: 400 });
        }
        const { userId } = parsed.data;

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
            // « Database error deleting user » = une FK vers users bloque la cascade
            // auth.users → public.users (cf. migrations/fix_user_delete_fk_actions.sql).
            // GoTrue ne remonte pas la contrainte fautive : on la révèle en tentant
            // la suppression côté table, dont l'erreur PostgREST est explicite.
            if (/database error/i.test(authError.message)) {
                const { error: probe } = await supabaseAdmin.from("users").delete().eq("id", userId);
                console.error("[delete-user] FK bloquante:", probe?.message ?? "(aucune erreur PostgREST)");
                return NextResponse.json(
                    { error: fkErrorMessage(probe?.message) },
                    { status: 409 }
                );
            }
            return NextResponse.json({ error: authError.message }, { status: 400 });
        }

        // Supprimer de la table users (au cas où pas de cascade)
        const { error: dbError } = await supabaseAdmin.from("users").delete().eq("id", userId);
        if (dbError) {
            console.error("[delete-user] dbError:", dbError.message);
            const status = dbError.code === "23503" ? 409 : 500;
            return NextResponse.json({ error: fkErrorMessage(dbError.message) }, { status });
        }

        return NextResponse.json({ success: true });
    } catch (err: any) {
        console.error("[delete-user] Unexpected error:", err?.message || err);
        return NextResponse.json({ error: err?.message || "Erreur serveur" }, { status: 500 });
    }
}

export const DELETE = requireRole(['admin', 'super_admin'], handleDeleteUser);
