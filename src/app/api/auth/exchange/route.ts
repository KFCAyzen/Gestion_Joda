import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
    try {
        const { access_token, refresh_token } = await request.json();
        if (!access_token || !refresh_token) {
            return NextResponse.json({ redirect: "/login" });
        }

        const cookieStore = await cookies();
        const supabase = createServerClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
            {
                cookies: {
                    getAll() { return cookieStore.getAll(); },
                    setAll(cookiesToSet) {
                        cookiesToSet.forEach(({ name, value, options }) =>
                            cookieStore.set(name, value, options)
                        );
                    },
                },
            }
        );

        const { data, error } = await supabase.auth.setSession({ access_token, refresh_token });
        if (error || !data.user) {
            return NextResponse.json({ redirect: "/login" });
        }

        const role = data.user.app_metadata?.role as string | undefined;
        return NextResponse.json({ redirect: role === "student" ? "/etudiant" : "/tableau-de-bord" });
    } catch {
        return NextResponse.json({ redirect: "/login" });
    }
}
