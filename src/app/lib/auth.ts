import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

export interface AuthSession {
  user: {
    id: string;
    email: string;
    role: string;
  };
}

export async function getServerSession(req: NextRequest): Promise<AuthSession | null> {
  const cookieStore = await cookies();
  
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options);
          });
        },
      },
    }
  );

  // getUser() vérifie le token auprès du serveur Auth (contrairement à getSession())
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return null;

  // Récupérer le rôle depuis la table users
  const { data: userData } = await supabase
    .from('users')
    .select('role')
    .eq('id', user.id)
    .single();

  if (!userData) return null;

  return {
    user: {
      id: user.id,
      email: user.email!,
      role: userData.role,
    },
  };
}

export function requireAuth(
  handler: (req: NextRequest, session: AuthSession) => Promise<NextResponse>
) {
  return async (req: NextRequest) => {
    const session = await getServerSession(req);
    
    if (!session) {
      return NextResponse.json(
        { error: 'Non authentifié' },
        { status: 401 }
      );
    }

    return handler(req, session);
  };
}

export function requireRole(
  allowedRoles: string[],
  handler: (req: NextRequest, session: AuthSession) => Promise<NextResponse>
) {
  return async (req: NextRequest) => {
    const session = await getServerSession(req);
    
    if (!session) {
      return NextResponse.json(
        { error: 'Non authentifié' },
        { status: 401 }
      );
    }

    if (!allowedRoles.includes(session.user.role)) {
      return NextResponse.json(
        { error: 'Accès refusé' },
        { status: 403 }
      );
    }

    return handler(req, session);
  };
}
