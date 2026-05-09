import { NextResponse } from "next/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

const supabaseAdmin = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET() {
    const cookieStore = await cookies();

    const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            cookies: {
                getAll() { return cookieStore.getAll(); },
                setAll() {},
            },
        }
    );

    // Valide le JWT directement — plus fiable que getSession()
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
        return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    // Lookup via service role (bypass RLS), essaie created_by ET user_id
    const { data: student } = await supabaseAdmin
        .from("students")
        .select("id")
        .or(`created_by.eq.${user.id},user_id.eq.${user.id}`)
        .single();

    if (!student) {
        return NextResponse.json([]);
    }

    const { data: payments, error } = await supabaseAdmin
        .from("payments")
        .select("*")
        .eq("student_id", student.id)
        .order("created_at", { ascending: false });

    if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(payments ?? []);
}
