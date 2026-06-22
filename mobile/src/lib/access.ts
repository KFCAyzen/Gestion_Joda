import type { UserRole } from './auth-context';

/* ============================================================
   Accès par rôle de l'app Admin — reproduit les sections de menu
   du web (`(app)/layout.tsx` §Accès par rôle du handoff).
   ============================================================ */

const RANK: Record<UserRole, number> = {
  student: 0,
  user: 1,
  agent: 2,
  supervisor: 3,
  admin: 4,
  super_admin: 5,
};

export type AdminModule =
  | 'performances'
  | 'candidatures'
  | 'etudiants'
  | 'dossiers'
  | 'messagerie'
  | 'newsletter'
  | 'universites'
  | 'frais'
  | 'cours'
  | 'comptabilite'
  | 'rh'
  | 'utilisateurs'
  | 'logs'
  | 'config_frais'
  | 'stockage'
  | 'notifications';

/** Rôle minimal requis par module (aligné sur la sidebar web). */
const MIN_RANK: Record<AdminModule, number> = {
  performances: RANK.supervisor,
  candidatures: RANK.agent,
  etudiants: RANK.agent,
  dossiers: RANK.agent,
  messagerie: RANK.agent,
  newsletter: RANK.agent,
  universites: RANK.agent,
  frais: RANK.agent,
  cours: RANK.agent,
  comptabilite: RANK.agent,
  rh: RANK.supervisor,
  utilisateurs: RANK.admin,
  logs: RANK.admin,
  config_frais: RANK.admin,
  stockage: RANK.super_admin,
  notifications: RANK.user,
};

export function canAccess(role: UserRole | undefined, module: AdminModule): boolean {
  if (!role) return false;
  return (RANK[role] ?? 0) >= MIN_RANK[module];
}

export function roleLabel(role: UserRole | undefined): string {
  switch (role) {
    case 'super_admin':
      return 'Super administrateur';
    case 'admin':
      return 'Administrateur';
    case 'supervisor':
      return 'Superviseur';
    case 'agent':
      return 'Agent';
    case 'user':
      return 'Utilisateur';
    default:
      return 'Membre';
  }
}
