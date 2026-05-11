import createMiddleware from 'next-intl/middleware';
import { locales, defaultLocale } from './i18n/config';
import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

export default async function proxy(request: NextRequest) {
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

  const { data: { user } } = await supabase.auth.getUser();
  const { pathname } = request.nextUrl;

  // Extract locale from pathname
  const pathHasLocale = locales.some(l => pathname.startsWith(`/${l}`));
  const locale = pathHasLocale 
    ? (pathname.split('/')[1] as typeof locales[number])
    : defaultLocale;

  // Check if this is a login page (with or without locale prefix)
  const loginPaths = locales.map(l => `/${l}/login`);
  const isLoginPage = pathname === '/login' || loginPaths.includes(pathname);
  const isApiRoute = pathname.startsWith('/api/');
  const isAuthCallback = pathname === '/auth/callback' || locales.some(l => pathname.startsWith(`/${l}/auth/callback`));
  const isStaticFile = /\.(?:svg|png|jpg|jpeg|gif|webp|ico|pdf|sw\.js)$/.test(pathname);

  if (isApiRoute || isStaticFile) {
    return supabaseResponse;
  }

  // For auth callback, let the auth flow handle it
  if (isAuthCallback) {
    const intlResponse = NextResponse.next({ request });
    supabaseResponse.cookies.getAll().forEach(cookie => {
      intlResponse.cookies.set(cookie.name, cookie.value, cookie);
    });
    return intlResponse;
  }

  // Redirect root path to default locale dashboard
  if (pathname === '/') {
    return NextResponse.redirect(new URL(`/${defaultLocale}/tableau-de-bord`, request.url));
  }

  // Redirect locale-less paths to localized versions
  if (!pathHasLocale && !isApiRoute && pathname !== '/') {
    const localizedPath = `/${defaultLocale}${pathname}`;
    return NextResponse.redirect(new URL(localizedPath, request.url));
  }

  // Redirect to /login if no session
  if (!user && !isLoginPage) {
    const loginUrl = new URL(`/${locale}/login`, request.url);
    loginUrl.searchParams.set('redirect', pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Redirect to dashboard if already connected and on /login
  if (user && isLoginPage) {
    return NextResponse.redirect(new URL(`/${locale}/tableau-de-bord`, request.url));
  }

  // Apply next-intl middleware for locale routing
  const intlMiddleware = createMiddleware({
    locales,
    defaultLocale,
    localePrefix: 'as-needed'
  });

  const response = intlMiddleware(request);
  
  // Preserve any cookies set by Supabase
  supabaseResponse.cookies.getAll().forEach(cookie => {
    response.cookies.set(cookie.name, cookie.value, cookie);
  });
  
  return response;
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|pdf|sw\\.js)).*)',
  ],
};