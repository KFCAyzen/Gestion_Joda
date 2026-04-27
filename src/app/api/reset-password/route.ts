import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: NextRequest) {
    try {
        const { userId, newPassword, confirmEmail } = await req.json();

        if (!userId) {
            return NextResponse.json({ error: "userId manquant" }, { status: 400 });
        }

        const updates: Record<string, any> = {};
        if (confirmEmail) updates.email_confirm = true;
        if (newPassword) updates.password = newPassword;

        if (Object.keys(updates).length === 0) {
            return NextResponse.json({ error: "Aucune mise à jour fournie" }, { status: 400 });
        }

        const { error: authError } = await supabaseAdmin.auth.admin.updateUserById(userId, updates);

        if (authError) {
            console.error("[reset-password] authError:", authError.message);
            return NextResponse.json({ error: authError.message }, { status: 400 });
        }

        // Si reset de mot de passe, marquer must_change_password
        if (newPassword) {
            const { error: dbError } = await supabaseAdmin
                .from("users")
                .update({ must_change_password: true, updated_at: new Date().toISOString() })
                .eq("id", userId);

            if (dbError) {
                console.error("[reset-password] dbError:", dbError.message);
                return NextResponse.json({ error: dbError.message }, { status: 500 });
            }
        }

        return NextResponse.json({ success: true });
    } catch (err: any) {
        console.error("[reset-password] Unexpected error:", err?.message || err);
        return NextResponse.json({ error: err?.message || "Erreur serveur" }, { status: 500 });
    }
}
