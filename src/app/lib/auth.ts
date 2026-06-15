import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';

export interface AuthSession {
  user: {
    id: string;
    email: string;
    role: string;
  };
}

// Construit un client Supabase pour la requête entrante :
//   - Mobile (natif) : session via en-tête `Authorization: Bearer <access_token>`
//   - Web : session via cookies (@supabase/ssr)
async function createRequestClient(req: NextRequest) {
  const authHeader = req.headers.get('authorization');
  const bearer = authHeader?.toLowerCase().startsWith('bearer ')
    ? authHeader.slice(7).trim()
    : null;

  if (bearer) {
    return createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        global: { headers: { Authorization: `Bearer ${bearer}` } },
        auth: { persistSession: false, autoRefreshToken: false },
      }
    );
  }

  const cookieStore = await cookies();
  return createServerClient(
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
}

export async function getServerSession(req: NextRequest): Promise<AuthSession | null> {
  const supabase = await createRequestClient(req);

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
