import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";

const CLIENT_SIDE_PAGE = `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <title>Connexion en cours…</title>
  <style>
    body{margin:0;display:flex;align-items:center;justify-content:center;min-height:100vh;background:#000;color:#fff;font-family:sans-serif;font-size:16px;}
  </style>
</head>
<body>
  <p>Connexion en cours…</p>
  <script>
    (async () => {
      try {
        const hash = window.location.hash.slice(1);
        const p = new URLSearchParams(hash);
        const access_token = p.get('access_token');
        const refresh_token = p.get('refresh_token');
        if (!access_token || !refresh_token) { window.location.href = '/login'; return; }
        const res = await fetch('/api/auth/exchange', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ access_token, refresh_token })
        });
        const json = await res.json();
        window.location.href = json.redirect || '/login';
      } catch { window.location.href = '/login'; }
    })();
  </script>
</body>
</html>`;

export async function GET(request: NextRequest) {
    const { searchParams, origin } = new URL(request.url);
    const code = searchParams.get("code");

    if (code) {
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
        const { error } = await supabase.auth.exchangeCodeForSession(code);
        if (!error) {
            const { data: { user } } = await supabase.auth.getUser();
            const role = user?.app_metadata?.role as string | undefined;
            return NextResponse.redirect(new URL(role === "student" ? "/etudiant" : "/tableau-de-bord", origin));
        }
        return NextResponse.redirect(new URL("/login", origin));
    }

    // Pas de ?code= → les tokens sont dans le hash (fragment) côté client
    return new NextResponse(CLIENT_SIDE_PAGE, {
        headers: { "Content-Type": "text/html; charset=utf-8" },
    });
}
