import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const response = NextResponse.next({
    request,
  });

  // Create Supabase client for middleware
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            request.cookies.set(name, value);
            response.cookies.set(name, value, options);
          });
        },
      },
    }
  );

  return supabase.auth.getSession().then(({ data: { session } }) => {
    const { pathname } = request.nextUrl;
    
    // Routes publiques qui ne nécessitent pas d'authentification
    const publicRoutes = ['/', '/login', '/signup', '/forgot-password', '/reset-password'];
    const isPublicRoute = publicRoutes.includes(pathname) || pathname.startsWith('/api/auth');
    
    // Si la route est publique, laisser passer
    if (isPublicRoute) {
      return response;
    }
    
    // Si pas de session, rediriger vers login
    if (!session) {
      const loginUrl = new URL('/login', request.url);
      loginUrl.searchParams.set('redirect', pathname);
      return NextResponse.redirect(loginUrl);
    }
    
    // Vérifier le rôle pour les routes admin
    const userRole = (session.user.user_metadata as Record<string, unknown>)?.role as string | undefined;
    const isAdminRoute = pathname.startsWith('/admin') || pathname.startsWith('/users');
    
    if (isAdminRoute && userRole !== 'admin' && userRole !== 'super_admin') {
      return NextResponse.redirect(new URL('/', request.url));
    }
    
    return response;
  });
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};