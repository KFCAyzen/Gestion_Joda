import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import type { Session } from '@supabase/supabase-js';

import { supabase } from './supabase';
import { apiFetch } from './api';
import { resolveLoginEmail } from './student-auth';

export type UserRole = 'student' | 'agent' | 'admin' | 'supervisor' | 'user' | 'super_admin';

export interface AuthUser {
  id: string;
  username: string;
  role: UserRole;
  name: string;
  email?: string;
  mustChangePassword: boolean;
  isActive: boolean;
}

type LoginResult = { success: boolean; message?: string };

interface AuthContextType {
  user: AuthUser | null;
  loading: boolean;
  login: (identifier: string, password: string) => Promise<LoginResult>;
  logout: () => Promise<void>;
  /** Réinitialisation : le serveur envoie un mot de passe temporaire (email/SMS). */
  forgotPassword: (identifier: string, channel?: 'email' | 'sms') => Promise<void>;
  /** Flux must_change_password : définit le nouveau mdp puis lève le flag serveur. */
  changePassword: (newPassword: string) => Promise<LoginResult>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

/** Charge le profil applicatif (table `users`) — mappé sur l'AuthContext web. */
async function loadProfile(userId: string): Promise<AuthUser | 'inactive' | null> {
  const { data, error } = await supabase
    .from('users')
    .select('id, username, role, name, email, must_change_password, is_active')
    .eq('id', userId)
    .single();

  if (error || !data) return null;
  if (data.is_active === false) return 'inactive';

  return {
    id: data.id,
    username: data.username,
    role: data.role,
    name: data.name,
    email: data.email,
    mustChangePassword: data.must_change_password === true,
    isActive: data.is_active !== false,
  };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Reprise de session au démarrage (session chiffrée en SecureStore).
    supabase.auth.getSession().then(async ({ data }) => {
      if (data.session?.user) {
        const profile = await loadProfile(data.session.user.id);
        if (profile && profile !== 'inactive') setUser(profile);
        else await supabase.auth.signOut();
      }
      setLoading(false);
    });

    const { data: sub } = supabase.auth.onAuthStateChange(async (event, session: Session | null) => {
      if (event === 'SIGNED_OUT' || !session?.user) {
        setUser(null);
        return;
      }
      if (event === 'TOKEN_REFRESHED') {
        const profile = await loadProfile(session.user.id);
        if (profile && profile !== 'inactive') setUser(profile);
      }
    });

    return () => sub.subscription.unsubscribe();
  }, []);

  const login = async (identifier: string, password: string): Promise<LoginResult> => {
    const email = resolveLoginEmail(identifier);
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      return { success: false, message: 'Identifiants invalides. Vérifie puis réessaie.' };
    }
    if (!data.user) {
      return { success: false, message: 'Connexion incomplète. Réessaie.' };
    }

    const profile = await loadProfile(data.user.id);
    if (profile === 'inactive') {
      await supabase.auth.signOut();
      return {
        success: false,
        message: "Ce compte n'est pas encore actif. Contacte l'équipe Joda Company.",
      };
    }
    if (!profile) {
      await supabase.auth.signOut();
      return { success: false, message: 'Profil introuvable. Contacte un administrateur.' };
    }

    setUser(profile);
    return { success: true };
  };

  const logout = async () => {
    await supabase.auth.signOut({ scope: 'local' });
    setUser(null);
  };

  const forgotPassword = async (identifier: string, channel: 'email' | 'sms' = 'email') => {
    const v = identifier.trim();
    if (!v) return;
    const body = v.includes('@') ? { email: v } : { username: v, channel };
    try {
      // Toujours silencieux côté résultat (anti-énumération, comme le web).
      await apiFetch('/api/forgot-password', { method: 'POST', body: JSON.stringify(body) });
    } catch {
      // ignore
    }
  };

  const changePassword = async (newPassword: string): Promise<LoginResult> => {
    if (newPassword.length < 8) {
      return { success: false, message: 'Au moins 8 caractères.' };
    }
    const { error: pwErr } = await supabase.auth.updateUser({ password: newPassword });
    if (pwErr) {
      return { success: false, message: 'Impossible de définir le mot de passe. Réessaie.' };
    }

    // Lève le flag côté serveur (route protégée, bypasse le RLS via service role).
    const res = await apiFetch('/api/clear-password-flag', { method: 'POST' });
    if (!res.ok) {
      return { success: false, message: 'Mot de passe défini, mais la finalisation a échoué.' };
    }

    // Recharge le profil → mustChangePassword=false → le routeur bascule vers l'app.
    const { data } = await supabase.auth.getUser();
    if (data.user) {
      const profile = await loadProfile(data.user.id);
      if (profile && profile !== 'inactive') setUser(profile);
    }
    return { success: true };
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, forgotPassword, changePassword }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextType {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
