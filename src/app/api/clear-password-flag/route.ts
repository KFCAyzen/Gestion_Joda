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

    return NextResponse.json({ success: true });
}

export const POST = requireAuth(handleClearPasswordFlag);
