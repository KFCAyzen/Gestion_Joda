import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";
import { hashResetToken } from "@/app/lib/passwordReset";
import { sanitizePasswordInput } from "@/app/lib/password";

/**
 * Consommation d'un lien de réinitialisation : l'utilisateur choisit lui-même son
 * nouveau mot de passe. Volontairement NON authentifiée — la personne qui arrive ici
 * est par définition incapable de se connecter. Le token tient lieu de preuve.
 */

const bodySchema = z.object({
    token: z.string().min(1),
    password: z.string().min(8, "Minimum 8 caractères"),
});

const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Message unique pour token inconnu, déjà consommé ou expiré : ne rien révéler sur
// l'existence d'un compte ni sur l'état d'un lien.
const INVALID_TOKEN =
    "Ce lien de réinitialisation est invalide, a déjà servi ou a expiré. Demandez-en un nouveau.";

export async function POST(req: NextRequest) {
    try {
        const parsed = bodySchema.safeParse(await req.json());
        if (!parsed.success) {
            return NextResponse.json(
                { error: parsed.error.issues[0]?.message ?? "Requête invalide" },
                { status: 400 }
            );
        }

        // Même nettoyage qu'à la connexion, sinon un mot de passe défini avec une espace
        // finale invisible serait ensuite refusé par le login qui, lui, la retire.
        const password = sanitizePasswordInput(parsed.data.password);
        if (password.length < 8) {
            return NextResponse.json({ error: "Minimum 8 caractères" }, { status: 400 });
        }

        const tokenHash = hashResetToken(parsed.data.token);

        const { data: row, error: lookupError } = await supabaseAdmin
            .from("password_reset_tokens")
            .select("id, user_id, expires_at, used_at")
            .eq("token_hash", tokenHash)
            .maybeSingle();

        if (lookupError) {
            console.error("[reset-password/confirm] lecture token:", lookupError.message);
            return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
        }

        if (!row || row.used_at || new Date(row.expires_at) <= new Date()) {
            return NextResponse.json({ error: INVALID_TOKEN }, { status: 400 });
        }

        // Consommation atomique (compare-and-set sur `used_at IS NULL`) AVANT de toucher
        // au mot de passe : deux requêtes concurrentes avec le même lien ne peuvent pas
        // aboutir toutes les deux. Si le changement échoue ensuite, le token est brûlé —
        // c'est le bon compromis, l'utilisateur redemande un lien.
        const { data: claimed, error: claimError } = await supabaseAdmin
            .from("password_reset_tokens")
            .update({ used_at: new Date().toISOString() })
            .eq("id", row.id)
            .is("used_at", null)
            .select("id")
            .maybeSingle();

        if (claimError || !claimed) {
            return NextResponse.json({ error: INVALID_TOKEN }, { status: 400 });
        }

        const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(row.user_id, {
            password,
        });

        if (updateError) {
            console.error("[reset-password/confirm] updateUser:", updateError.message);
            return NextResponse.json({ error: updateError.message }, { status: 400 });
        }

        // L'utilisateur a choisi son mot de passe : pas de changement forcé à la connexion.
        await supabaseAdmin
            .from("users")
            .update({ must_change_password: false })
            .eq("id", row.user_id);

        // Révoquer les autres liens encore en circulation pour ce compte.
        await supabaseAdmin
            .from("password_reset_tokens")
            .update({ used_at: new Date().toISOString() })
            .eq("user_id", row.user_id)
            .is("used_at", null);

        console.log(`[reset-password/confirm] mot de passe redefini pour user ${row.user_id}`);
        return NextResponse.json({ success: true });
    } catch (err: any) {
        console.error("[reset-password/confirm] erreur:", err?.message || err);
        return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
    }
}
