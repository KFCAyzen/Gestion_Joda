import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { requireAuth, AuthSession } from "@/app/lib/auth";

const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function handleClearPasswordFlag(_req: NextRequest, session: AuthSession) {
    const { error } = await supabaseAdmin
        .from("users")
        .update({ must_change_password: false, updated_at: new Date().toISOString() })
        .eq("id", session.user.id);

    if (error) {
        console.error("[clear-password-flag]", error.message);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Efface aussi le flag dans raw_user_meta_data de auth.users.
    // Si le trigger handle_new_user refire (re-insert ou conflict),
    // il lira false depuis les métadonnées et ne remettra pas le flag à true.
    const { error: metaError } = await supabaseAdmin.auth.admin.updateUserById(
        session.user.id,
        { user_metadata: { must_change_password: false } },
    );
    if (metaError) {
        console.warn("[clear-password-flag] meta update failed (non-bloquant):", metaError.message);
    }

    return NextResponse.json({ success: true });
}

export const POST = requireAuth(handleClearPasswordFlag);
