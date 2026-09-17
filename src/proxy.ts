import createMiddleware from 'next-intl/middleware';
import { locales, defaultLocale } from './i18n/config';
import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';
import { isSessionRejected } from './app/lib/authErrors';

const intlMiddleware = createMiddleware({
  locales,
  defaultLocale,
  localePrefix: 'always'
});

/** Supprime les cookies de session Supabase portés par la requête. */
function clearAuthCookies(request: NextRequest, response: NextResponse) {
  request.cookies.getAll().forEach(cookie => {
    if (cookie.name.includes('sb-') || cookie.name.includes('auth-token')) {
      response.cookies.delete(cookie.name);
    }
  });
}

export default async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Static files bypass all middleware
  const isStaticFile = /\.(?:svg|png|jpg|jpeg|gif|webp|ico|pdf|html|sw\.js)$/.test(pathname) || pathname.startsWith('/_next') || pathname.startsWith('/templates/');
  
  if (isStaticFile) {
    return NextResponse.next();
  }

  // Extract locale from pathname
  const pathSegments = pathname.split('/');
  const potentialLocale = pathSegments[1];
  const hasLocale = locales.includes(potentialLocale as any);
  const locale = hasLocale ? potentialLocale : defaultLocale;
  
  // Remove locale from pathname for route checking
  const pathnameWithoutLocale = hasLocale ? '/' + pathSegments.slice(2).join('/') : pathname;
  
  const isLoginPage = pathnameWithoutLocale === '/login' || pathnameWithoutLocale === '';
  const isAuthCallback = pathnameWithoutLocale.startsWith('/auth/callback');
  const isEtudiantPortal = pathnameWithoutLocale === '/etudiant';
  const isRegisterPage = pathnameWithoutLocale === '/register';
  const isPublicReport = pathnameWithoutLocale === '/rapport';
  // Réinitialisation par lien : forcément accessible sans session, l'utilisateur
  // qui arrive ici est par définition incapable de se connecter.
  const isResetPassword = pathnameWithoutLocale === '/reset-password';
  const isApiRoute = pathname.startsWith('/api/');
  const isPublicRoute = isLoginPage || isAuthCallback || isEtudiantPortal || isRegisterPage || isPublicReport || isResetPassword;

  // L'espace rapport (nom + PIN) n'utilise jamais la session Supabase : inutile
  // d'attendre `getUser()` — un appel réseau au serveur d'auth à chaque chargement,
  // qui suspendait la page quand l'auth était lente ou rate-limitée (429 par vagues
  // derrière l'IP du bureau) alors que la page n'en a aucun besoin.
  if (isPublicReport) {
    return intlMiddleware(request);
  }

  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // Check authentication
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  
  if (authError) {
    // On ne purge les cookies que sur un rejet RECONNU du token. Une erreur réseau,
    // un 429 ou un 5xx ne disent rien de la validité de la session : purger dans ce
    // cas déconnectait des utilisateurs authentifiés, contraints de ressaisir leur
    // mot de passe. En les conservant, la session reprend d'elle-même dès que
    // l'incident se dissipe — au pire un aller-retour par le login.
    const shouldClearCookies = isSessionRejected(authError);

    // La redirection, elle, est inconditionnelle sur une route protégée, y compris
    // quand l'erreur n'est pas concluante. Laisser passer ouvrirait la porte à
    // quiconque sait provoquer un 429/5xx sur `getUser()` (cookie de session expiré
    // forgé → refresh rate-limité → 429). Cette porte ne blesse rien aujourd'hui
    // parce qu'aucune route protégée ne rend de données côté serveur, mais rien
    // n'impose cet invariant : le premier composant serveur qui lira des données
    // sous `(app)/` le romprait en silence. On ne fait pas reposer l'autorisation
    // sur une propriété que personne ne garantit.
    if (!isPublicRoute && !isApiRoute) {
      const redirectResponse = NextResponse.redirect(new URL(`/${locale}/login`, request.url));
      if (shouldClearCookies) clearAuthCookies(request, redirectResponse);
      return redirectResponse;
    }

    const intlResponse = intlMiddleware(request);
    if (shouldClearCookies) clearAuthCookies(request, intlResponse);
    return intlResponse;
  }

  // Auth callback handling
  if (isAuthCallback) {
    return supabaseResponse;
  }

  // Redirect root to dashboard or login
  if (pathname === '/' || (hasLocale && pathnameWithoutLocale === '')) {
    if (user) {
      return NextResponse.redirect(new URL(`/${locale}/tableau-de-bord`, request.url));
    }
    return NextResponse.redirect(new URL(`/${locale}/login`, request.url));
  }

  // Protect all routes except public ones (login, etudiant portal, register, rapport)
  if (!user && !isPublicRoute) {
    const loginUrl = new URL(`/${locale}/login`, request.url);
    loginUrl.searchParams.set('redirect', pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Redirect to dashboard if already logged in and on login page
  if (user && isLoginPage) {
    return NextResponse.redirect(new URL(`/${locale}/tableau-de-bord`, request.url));
  }

  // API routes: verify user session exists
  if (isApiRoute && !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Apply next-intl middleware for locale routing
  const response = intlMiddleware(request);
  
  // Preserve any cookies set by Supabase
  supabaseResponse.cookies.getAll().forEach(cookie => {
    response.cookies.set(cookie.name, cookie.value, cookie);
  });
  
  return response;
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|api/.*|templates/.*|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|pdf|html|sw\\.js)).*)',
  ],
};