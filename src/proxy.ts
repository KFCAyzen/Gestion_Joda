import createMiddleware from 'next-intl/middleware';
import { locales, defaultLocale } from './i18n/config';
import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

export default async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Static files bypass all middleware
  const isStaticFile = /\.(?:svg|png|jpg|jpeg|gif|webp|ico|pdf|sw\.js)$/.test(pathname) || pathname.startsWith('/_next');
  
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
  const isApiRoute = pathname.startsWith('/api/');

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
  
  // Clear invalid tokens
  if (authError) {
    const response = NextResponse.next({ request });
    // Delete all auth cookies
    request.cookies.getAll().forEach(cookie => {
      if (cookie.name.includes('sb-') || cookie.name.includes('auth-token')) {
        response.cookies.delete(cookie.name);
      }
    });
    
    // Allow access to public routes only
    if (!isLoginPage && !isAuthCallback && !isEtudiantPortal && !isApiRoute) {
      return NextResponse.redirect(new URL(`/${locale}/login`, request.url));
    }
    
    // Apply intl middleware for public routes
    const intlMiddleware = createMiddleware({
      locales,
      defaultLocale,
      localePrefix: 'always'
    });
    const intlResponse = intlMiddleware(request);
    
    // Preserve cookie deletions
    request.cookies.getAll().forEach(cookie => {
      if (cookie.name.includes('sb-') || cookie.name.includes('auth-token')) {
        intlResponse.cookies.delete(cookie.name);
      }
    });
    
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

  // Protect all routes except login and etudiant portal
  if (!user && !isLoginPage && !isEtudiantPortal) {
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
  const intlMiddleware = createMiddleware({
    locales,
    defaultLocale,
    localePrefix: 'always'
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
    '/((?!_next/static|_next/image|favicon.ico|api/.*|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|pdf|sw\\.js)).*)',
  ],
};