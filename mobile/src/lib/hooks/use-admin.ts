import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { supabase } from '../supabase';
import { apiFetch } from '../api';
import { logActivity } from '../activity-log';
import { DOSSIER_TRANSITIONS } from '../dossier-milestones';
import type { DossierStatus } from './use-student-portal';
import type { UserRole } from '../auth-context';

type Actor = { id?: string | null; name?: string | null; role?: string | null };

/* ============================================================
   Hooks de l'app Admin — branchés sur les vraies tables Supabase.
   ============================================================ */

const WEEKDAYS = ['D', 'L', 'M', 'M', 'J', 'V', 'S'];
const A_TRAITER: DossierStatus[] = ['document_manquant', 'en_attente', 'en_attente_universite'];

/* ── Tableau de bord opérationnel ────────────────────────────────────────── */
export type DashFlux = { l: string; v: number; today?: boolean };
export type AdminDashboard = {
  aTraiter: number;
  dossiersOuverts: number;
  dossiersGrowth: number;
  encaisseMois: number;
  flux: DashFlux[];
  topUniv: { name: string; count: number }[];
};

export function useAdminDashboard() {
  return useQuery({
    queryKey: ['admin', 'dashboard'],
    queryFn: async (): Promise<AdminDashboard> => {
      const now = new Date();
      const startMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
      const start7 = new Date(now.getTime() - 6 * 86_400_000);
      start7.setHours(0, 0, 0, 0);

      const [dossiers, entrees, univs] = await Promise.all([
        supabase.from('dossier_bourses').select('status, university_id, created_at'),
        // « Encaissé ce mois » = trésorerie FCFA uniquement (les $ ont leur propre livre).
        supabase.from('entrees_comptables').select('montant, date').eq('devise', 'FCFA').gte('date', startMonth),
        supabase.from('universities').select('id, nom'),
      ]);

      const dRows = (dossiers.data as { status: DossierStatus; university_id: string | null; created_at: string }[]) ?? [];
      const aTraiter = dRows.filter((d) => A_TRAITER.includes(d.status)).length;
      const dossiersOuverts = dRows.filter((d) => d.status !== 'termine').length;
      const dossiersGrowth = dRows.filter((d) => new Date(d.created_at) >= new Date(startMonth)).length;
      const encaisseMois = ((entrees.data as { montant: number }[]) ?? []).reduce((s, e) => s + Number(e.montant || 0), 0);

      // Flux 7 jours (candidatures créées / jour).
      const flux: DashFlux[] = [];
      for (let i = 6; i >= 0; i--) {
        const day = new Date(now.getTime() - i * 86_400_000);
        const count = dRows.filter((d) => {
          const c = new Date(d.created_at);
          return c.toDateString() === day.toDateString();
        }).length;
        flux.push({ l: WEEKDAYS[day.getDay()], v: count, today: i === 0 });
      }

      // Top universités (par nombre de dossiers, semaine).
      const uMap = new Map<string, string>();
      for (const u of (univs.data as { id: string; nom: string }[]) ?? []) uMap.set(u.id, u.nom);
      const counts = new Map<string, number>();
      for (const d of dRows) {
        if (d.university_id && new Date(d.created_at) >= start7) {
          counts.set(d.university_id, (counts.get(d.university_id) ?? 0) + 1);
        }
      }
      const topUniv = [...counts.entries()]
        .map(([id, count]) => ({ name: uMap.get(id) ?? 'Université', count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 3);

      return { aTraiter, dossiersOuverts, dossiersGrowth, encaisseMois, flux, topUniv };
    },
    staleTime: 60 * 1000,
  });
}

/* ── Comptabilité (livre comptable) ──────────────────────────────────────── */
export type LedgerRow = {
  id: string;
  kind: 'in' | 'out';
  date: string;
  desc: string;
  cat: string;
  montant: number;
  needsValidation: boolean;
  rejected: boolean;
};
export type Ledger = {
  solde: number;
  entrees: number;
  sorties: number;
  /** Sorties de la période en attente de validation (pending, hors rejetées). */
  sortiesPending: number;
  toValidate: number;
  rows: LedgerRow[];
};

function isValidated(s: { status?: string | null; validated_at?: string | null }): boolean {
  if (s.status) return s.status === 'validated';
  return !!s.validated_at;
}

/** Début (ISO) de la période courante pour la vue choisie (borne serveur). */
function ledgerPeriodStartIso(view: string): string {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  switch (view) {
    case 'jour':
      return d.toISOString();
    case 'semaine': {
      const s = new Date(d);
      s.setDate(d.getDate() - d.getDay());
      return s.toISOString();
    }
    case 'mois':
      return new Date(d.getFullYear(), d.getMonth(), 1).toISOString();
    case 'trimestre':
      return new Date(d.getFullYear(), Math.floor(d.getMonth() / 3) * 3, 1).toISOString();
    case 'annee':
      return new Date(d.getFullYear(), 0, 1).toISOString();
    default:
      return new Date(0).toISOString();
  }
}

export function useAccountingLedger(view: string = 'mois', devise: 'FCFA' | 'USD' = 'FCFA') {
  return useQuery({
    queryKey: ['admin', 'ledger', view, devise],
    queryFn: async (): Promise<Ledger> => {
      const startIso = ledgerPeriodStartIso(view);
      const [entRes, sorRes, pendRes] = await Promise.all([
        supabase.from('entrees_comptables').select('*').eq('devise', devise).gte('date', startIso).order('date', { ascending: false }).limit(1000),
        supabase.from('sorties_comptables').select('*').eq('devise', devise).gte('date', startIso).order('date', { ascending: false }).limit(1000),
        // Sorties à valider : comptage GLOBAL (indépendant de la période) pour
        // ne jamais masquer une dépense en attente d'action. head=true → aucune
        // ligne transférée, juste le count.
        supabase.from('sorties_comptables').select('id', { count: 'exact', head: true }).eq('devise', devise).neq('status', 'validated'),
      ]);
      const ent = (entRes.data as any[]) ?? [];
      const sor = (sorRes.data as any[]) ?? [];

      const entrees = ent.reduce((s, e) => s + Number(e.montant || 0), 0);
      const sortiesValid = sor.filter(isValidated).reduce((s, x) => s + Number(x.montant || 0), 0);
      // Sorties de la période en attente (pending) — exclut les rejetées, comme le web.
      const sortiesPending = sor
        .filter((s) => !isValidated(s) && s.status !== 'rejected')
        .reduce((acc, x) => acc + Number(x.montant || 0), 0);
      const toValidate = pendRes.count ?? sor.filter((s) => !isValidated(s)).length;

      const rows: LedgerRow[] = [
        ...ent.map((e) => ({
          id: e.id,
          kind: 'in' as const,
          date: e.date,
          desc: e.description ?? 'Entrée',
          cat: e.type ?? 'Divers',
          montant: Number(e.montant || 0),
          needsValidation: false,
          rejected: false,
        })),
        ...sor.map((s) => ({
          id: s.id,
          kind: 'out' as const,
          date: s.date,
          desc: s.description ?? 'Sortie',
          cat: s.categorie ?? 'Divers',
          montant: Number(s.montant || 0),
          // Seules les sorties 'pending' sont à valider (les rejetées ne le sont plus).
          needsValidation: !isValidated(s) && s.status !== 'rejected',
          rejected: s.status === 'rejected',
        })),
      ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

      return { solde: entrees - sortiesValid, entrees, sorties: sortiesValid, sortiesPending, toValidate, rows };
    },
    staleTime: 60 * 1000,
  });
}

/**
 * Solde de trésorerie global lu depuis le cache maintenu par triggers
 * (migration add_treasury_balance_cache.sql). Lecture O(1), sans scanner
 * l'historique. Retourne `null` si le cache est indisponible (migration pas
 * encore appliquée) → l'écran retombe sur `useAccountingLedger().solde`.
 */
export function useTreasuryBalance(devise: 'FCFA' | 'USD' = 'FCFA') {
  return useQuery({
    queryKey: ['admin', 'treasury', devise],
    queryFn: async (): Promise<number | null> => {
      const { data, error } = await supabase
        .from('comptabilite_solde')
        .select('solde')
        .eq('devise', devise)
        .maybeSingle();
      if (error || !data) return null;
      return Number((data as { solde: number }).solde);
    },
    staleTime: 30 * 1000,
  });
}

/**
 * Repli du solde global si le cache est indisponible (migration pas encore
 * appliquée). Ne charge que `montant` (+ `status` pour les sorties) et ne tourne
 * que si `enabled`. Une fois la migration en place, ce repli ne s'exécute jamais.
 */
export function useTreasuryBalanceFallback(enabled: boolean, devise: 'FCFA' | 'USD' = 'FCFA') {
  return useQuery({
    queryKey: ['admin', 'treasury', 'fallback', devise],
    enabled,
    queryFn: async (): Promise<number> => {
      const [entRes, sorRes] = await Promise.all([
        supabase.from('entrees_comptables').select('montant').eq('devise', devise),
        supabase.from('sorties_comptables').select('montant, status').eq('devise', devise),
      ]);
      const e = ((entRes.data as any[]) ?? []).reduce((s, r) => s + Number(r.montant || 0), 0);
      const so = ((sorRes.data as any[]) ?? [])
        .filter((r) => r.status === 'validated')
        .reduce((s, r) => s + Number(r.montant || 0), 0);
      return e - so;
    },
    staleTime: 30 * 1000,
  });
}

/**
 * Valide une sortie comptable — miroir `LivreComptable.handleValidateSortie`.
 * Pose `validated_by`/`validated_at` (parité web) ET `status='validated'` en
 * best-effort : la lecture mobile (`isValidated`) privilégie `status`, donc on
 * aligne les deux sans casser si la colonne `status` n'existe pas.
 */
export function useValidateSortie(actor?: Actor) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const nowIso = new Date().toISOString();
      const { error } = await supabase
        .from('sorties_comptables')
        .update({ validated_by: actor?.id ?? null, validated_at: nowIso })
        .eq('id', id);
      if (error) throw error;

      // best-effort : flip du `status` si la colonne existe (cohérence d'affichage).
      const { error: statusErr } = await supabase
        .from('sorties_comptables')
        .update({ status: 'validated' })
        .eq('id', id);
      if (statusErr) console.warn('[sortie status] non posé:', statusErr.message);

      await logActivity(actor ?? {}, 'accounting_expense', 'sorties_comptables', id, 'Sortie comptable validée', {});
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'ledger'] });
      qc.invalidateQueries({ queryKey: ['admin', 'treasury'] });
    },
  });
}

/**
 * Rejette une sortie comptable — miroir `LivreComptable.handleRejectSortie`.
 * Pose `status='rejected'` + colonnes de rejet ; la sortie n'impacte pas la
 * trésorerie (le trigger ne déduit que les sorties 'validated').
 */
export function useRejectSortie(actor?: Actor) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, reason }: { id: string; reason: string }) => {
      const { error } = await supabase
        .from('sorties_comptables')
        .update({
          status: 'rejected',
          rejected_by: actor?.id ?? null,
          rejected_at: new Date().toISOString(),
          rejection_reason: reason || null,
        })
        .eq('id', id);
      if (error) throw error;
      await logActivity(
        actor ?? {},
        'accounting_expense',
        'sorties_comptables',
        id,
        `Sortie comptable rejetée${reason ? ` — ${reason}` : ''}`,
        {},
      );
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'ledger'] });
      qc.invalidateQueries({ queryKey: ['admin', 'treasury'] });
    },
  });
}

/**
 * Ajoute une écriture comptable manuelle — miroir `LivreComptable.handleAdd`.
 * `entree` → `entrees_comptables` (avec `type`), `sortie` → `sorties_comptables`
 * (avec `categorie`).
 */
export function useAddAccountingEntry(actor?: Actor) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      kind,
      montant,
      description,
      type,
      categorie,
      devise = 'FCFA',
    }: {
      kind: 'entree' | 'sortie';
      montant: number;
      description: string;
      type?: string;
      categorie?: string;
      devise?: 'FCFA' | 'USD';
    }) => {
      const nowIso = new Date().toISOString();
      if (kind === 'entree') {
        const { data, error } = await supabase
          .from('entrees_comptables')
          .insert({ montant, description, type: type ?? 'revenus_divers', devise, date: nowIso, created_by: actor?.id ?? null })
          .select('id')
          .single();
        if (error) throw error;
        await logActivity(actor ?? {}, 'accounting_entry', 'entrees_comptables', data?.id ?? null, `Entrée comptable — ${description}`, { montant });
      } else {
        const { data, error } = await supabase
          .from('sorties_comptables')
          .insert({ montant, description, categorie: categorie ?? 'divers', devise, date: nowIso, created_by: actor?.id ?? null })
          .select('id')
          .single();
        if (error) throw error;
        await logActivity(actor ?? {}, 'accounting_expense', 'sorties_comptables', data?.id ?? null, `Sortie comptable — ${description}`, { montant });
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'ledger'] });
      qc.invalidateQueries({ queryKey: ['admin', 'treasury'] });
    },
  });
}

/* ── Notifications ───────────────────────────────────────────────────────── */
export type AppNotification = {
  id: string;
  type: string;
  titre: string;
  message: string;
  read: boolean;
  created_at: string;
};

export function useAdminNotifications(userId?: string) {
  return useQuery({
    queryKey: ['admin', 'notifications', userId],
    queryFn: async (): Promise<AppNotification[]> => {
      const { data, error } = await supabase
        .from('notifications')
        .select('id, type, titre, message, read, created_at')
        .eq('user_id', userId!)
        .order('created_at', { ascending: false })
        .limit(80);
      if (error) throw error;
      return (data as AppNotification[]) ?? [];
    },
    enabled: !!userId,
    staleTime: 30 * 1000,
  });
}

export function useMarkAllNotificationsRead(userId?: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      if (!userId) return;
      await supabase.from('notifications').update({ read: true }).eq('user_id', userId).eq('read', false);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'notifications', userId] }),
  });
}

/* ── Journal d'activité ──────────────────────────────────────────────────── */
export type ActivityLog = {
  id: string;
  user_name: string;
  user_role: string;
  activity_type: string;
  description: string;
  created_at: string;
};

export function useActivityLogs() {
  return useQuery({
    queryKey: ['admin', 'logs'],
    queryFn: async (): Promise<ActivityLog[]> => {
      const { data, error } = await supabase
        .from('activity_logs')
        .select('id, user_name, user_role, activity_type, description, created_at')
        .order('created_at', { ascending: false })
        .limit(120);
      if (error) throw error;
      return (data as ActivityLog[]) ?? [];
    },
    staleTime: 30 * 1000,
  });
}

/* ── Universités ─────────────────────────────────────────────────────────── */
export type University = {
  id: string;
  nom: string;
  pays: string | null;
  ville: string | null;
  programme: string | null;
  active: boolean;
};

const FLAGS: Record<string, string> = { chine: '🇨🇳', canada: '🇨🇦', france: '🇫🇷', maroc: '🇲🇦', 'côte d’ivoire': '🇨🇮' };
export function flagFor(pays?: string | null): string {
  if (!pays) return '🎓';
  return FLAGS[pays.trim().toLowerCase()] ?? '🎓';
}

export function useUniversities() {
  return useQuery({
    queryKey: ['admin', 'universities'],
    queryFn: async (): Promise<University[]> => {
      const { data, error } = await supabase
        .from('universities')
        .select('id, nom, pays, ville, programme, active')
        .order('nom', { ascending: true });
      if (error) throw error;
      return (data as University[]) ?? [];
    },
    staleTime: 5 * 60 * 1000,
  });
}

export type UniversityInput = {
  id?: string;
  nom: string;
  pays: string;
  ville: string;
  programme: string;
  active: boolean;
};

/** Crée ou met à jour une université — miroir `UniversityManagement.handleSubmit`. */
export function useUpsertUniversity(actor?: Actor) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: UniversityInput) => {
      const payload = {
        nom: input.nom.trim(),
        pays: input.pays.trim() || null,
        ville: input.ville.trim() || null,
        programme: input.programme.trim() || null,
        active: input.active,
      };
      if (input.id) {
        const { error } = await supabase.from('universities').update(payload).eq('id', input.id);
        if (error) throw error;
        await logActivity(actor ?? {}, 'university_update', 'universities', input.id, `Université modifiée — ${payload.nom}`, { nom: payload.nom });
      } else {
        const { data, error } = await supabase.from('universities').insert(payload).select('id').single();
        if (error) throw error;
        await logActivity(actor ?? {}, 'university_create', 'universities', data?.id ?? null, `Université créée — ${payload.nom}`, { nom: payload.nom, pays: payload.pays });
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'universities'] }),
  });
}

/** Active/suspend une université — miroir `handleToggle`. */
export function useToggleUniversity() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, active }: { id: string; active: boolean }) => {
      const { error } = await supabase.from('universities').update({ active }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'universities'] }),
  });
}

/** Supprime une université — miroir `handleDelete`. */
export function useDeleteUniversity(actor?: Actor) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, nom }: { id: string; nom: string }) => {
      const { error } = await supabase.from('universities').delete().eq('id', id);
      if (error) throw error;
      await logActivity(actor ?? {}, 'university_delete', 'universities', id, `Université supprimée — ${nom}`, {});
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'universities'] }),
  });
}

/* ── Candidatures (dossier_bourses + étudiant) ───────────────────────────── */
export type Candidature = {
  id: string;
  studentId: string;
  name: string;
  program: string;
  status: DossierStatus;
  universityId: string | null;
  createdAt: string;
};

export function useCandidatures() {
  return useQuery({
    queryKey: ['admin', 'candidatures'],
    queryFn: async (): Promise<Candidature[]> => {
      const [dos, students] = await Promise.all([
        supabase.from('dossier_bourses').select('id, student_id, status, desired_program, university_id, created_at').order('created_at', { ascending: false }).limit(200),
        supabase.from('students').select('id, nom, prenom'),
      ]);
      const names = new Map<string, string>();
      for (const s of (students.data as { id: string; nom: string; prenom: string }[]) ?? []) {
        names.set(s.id, `${s.prenom ?? ''} ${s.nom ?? ''}`.trim());
      }
      return ((dos.data as any[]) ?? []).map((d) => ({
        id: d.id,
        studentId: d.student_id,
        name: names.get(d.student_id) || 'Étudiant',
        program: d.desired_program || 'Dossier',
        status: d.status,
        universityId: d.university_id ?? null,
        createdAt: d.created_at,
      }));
    },
    staleTime: 60 * 1000,
  });
}

/**
 * Traite une candidature — miroir partiel de `ApplicationManagement` :
 * affecte/remplace l'université et/ou fait avancer le statut (transitions
 * validées via DOSSIER_TRANSITIONS). Journalise + historise.
 */
export function useUpdateCandidature(actor?: Actor) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      dossierId,
      studentName,
      universityId,
      status,
      fromStatus,
    }: {
      dossierId: string;
      studentName: string;
      universityId?: string | null;
      status?: DossierStatus;
      fromStatus?: DossierStatus;
    }) => {
      const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
      if (universityId !== undefined) patch.university_id = universityId;
      if (status !== undefined) {
        if (fromStatus) {
          const allowed = DOSSIER_TRANSITIONS[fromStatus] ?? [];
          if (!allowed.includes(status)) throw new Error('Transition non autorisée');
        }
        patch.status = status;
      }

      const { error } = await supabase.from('dossier_bourses').update(patch).eq('id', dossierId);
      if (error) throw error;

      if (status !== undefined) {
        const { error: histErr } = await supabase.from('dossier_history').insert({
          dossier_id: dossierId,
          action: 'status_change',
          status,
          description: `${fromStatus ?? '?'} → ${status}`,
          performed_by: actor?.id ?? null,
        });
        if (histErr) console.warn('[dossier_history] insert error:', histErr.message);
        await logActivity(actor ?? {}, 'application_status_change', 'dossier_bourses', dossierId, `Candidature ${studentName} : ${fromStatus ?? '?'} → ${status}`, {
          previous_status: fromStatus,
          new_status: status,
        });
      }
      if (universityId !== undefined) {
        await logActivity(actor ?? {}, 'application_status_change', 'dossier_bourses', dossierId, `Candidature ${studentName} — université affectée`, {
          university_id: universityId,
        });
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'candidatures'] });
      qc.invalidateQueries({ queryKey: ['admin', 'dossiers'] });
      qc.invalidateQueries({ queryKey: ['admin', 'dashboard'] });
    },
  });
}

/* ── Cours de langues (à partir des paiements mandarin/anglais) ──────────── */
export type CoursePayment = { id: string; studentName: string; tranche: number | null; amount: number; status: string };
export type CourseStats = { active: number; revenue: number; payments: CoursePayment[] };
export function useLanguageCourses() {
  return useQuery({
    queryKey: ['admin', 'courses'],
    queryFn: async (): Promise<{ mandarin: CourseStats; anglais: CourseStats }> => {
      const [payRes, stuRes] = await Promise.all([
        supabase.from('payments').select('id, type, tranche, montant, montant_paye, status, student_id, created_at').in('type', ['mandarin', 'anglais']).order('created_at', { ascending: false }),
        supabase.from('students').select('id, nom, prenom'),
      ]);
      const rows = (payRes.data as any[]) ?? [];
      const names = new Map<string, string>();
      for (const s of (stuRes.data as { id: string; nom: string; prenom: string }[]) ?? []) {
        names.set(s.id, `${s.prenom ?? ''} ${s.nom ?? ''}`.trim());
      }
      const calc = (t: string): CourseStats => {
        const sub = rows.filter((r) => r.type === t);
        const active = new Set(sub.map((r) => r.student_id)).size;
        const revenue = sub.reduce((s, r) => s + Number(r.montant_paye ?? (r.status === 'paye' ? r.montant : 0)), 0);
        const payments: CoursePayment[] = sub.map((r) => ({
          id: r.id,
          studentName: names.get(r.student_id) || 'Étudiant',
          tranche: r.tranche ?? null,
          amount: Number(r.montant || 0),
          status: r.status,
        }));
        return { active, revenue, payments };
      };
      return { mandarin: calc('mandarin'), anglais: calc('anglais') };
    },
    staleTime: 2 * 60 * 1000,
  });
}

/** Marque un paiement de cours comme payé — miroir `CoursLangues.handleMarkPaid`. */
export function useMarkCoursePaid(actor?: Actor) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (paymentId: string) => {
      const nowIso = new Date().toISOString();
      const { error } = await supabase
        .from('payments')
        .update({ status: 'paye', date_paiement: nowIso, validated_by: actor?.id ?? null, validated_at: nowIso })
        .eq('id', paymentId);
      if (error) throw error;
      await logActivity(actor ?? {}, 'payment_validate', 'payments', paymentId, 'Paiement de cours marqué payé', { payment_id: paymentId });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'courses'] });
      qc.invalidateQueries({ queryKey: ['admin', 'ledger'] });
    },
  });
}

/**
 * Envoie une newsletter — miroir `NewsletterPage.handleSend` via
 * `/api/newsletter/send` (sujet, message, audience ciblée).
 */
export type NewsletterFilter = 'all' | 'dossier_attente' | 'dossier_cours' | 'payment_late' | 'langue_mandarin' | 'langue_anglais';
export function useSendNewsletter() {
  return useMutation({
    mutationFn: async ({ subject, message, filter }: { subject: string; message: string; filter: NewsletterFilter }) => {
      const res = await apiFetch('/api/newsletter/send', { method: 'POST', body: JSON.stringify({ subject, message, filter }) });
      const data = (await res.json().catch(() => ({}))) as { sent?: number; errors?: number; total?: number; error?: string };
      if (!res.ok) throw new Error(data.error || `Échec de l'envoi (HTTP ${res.status}).`);
      return { sent: data.sent ?? 0, errors: data.errors ?? 0, total: data.total ?? 0 };
    },
  });
}

/**
 * Envoie un SMS à un ou plusieurs étudiants — miroir `ComPage.handleSendSms`
 * via `/api/send-sms` (le serveur résout les téléphones depuis `studentIds`).
 */
export function useSendSms() {
  return useMutation({
    mutationFn: async ({ studentIds, message }: { studentIds: string[]; message: string }) => {
      const res = await apiFetch('/api/send-sms', { method: 'POST', body: JSON.stringify({ studentIds, message }) });
      const data = (await res.json().catch(() => ({}))) as { sent?: number; error?: string };
      if (!res.ok) throw new Error(data.error || `Échec de l'envoi SMS (HTTP ${res.status}).`);
      return { sent: data.sent ?? 0 };
    },
  });
}

/* ── Utilisateurs ────────────────────────────────────────────────────────── */
export type AppUser = {
  id: string;
  name: string;
  username: string;
  role: string;
  active: boolean;
  mustChange: boolean;
};

export function useAdminUsers() {
  return useQuery({
    queryKey: ['admin', 'users'],
    queryFn: async (): Promise<AppUser[]> => {
      const { data, error } = await supabase
        .from('users')
        .select('id, name, username, role, is_active, must_change_password')
        .order('name', { ascending: true });
      if (error) throw error;
      return ((data as any[]) ?? []).map((u) => ({
        id: u.id,
        name: u.name,
        username: u.username,
        role: u.role,
        active: u.is_active !== false,
        mustChange: u.must_change_password === true,
      }));
    },
    staleTime: 2 * 60 * 1000,
  });
}

export function useToggleUserActive() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, active }: { id: string; active: boolean }) => {
      const { error } = await supabase.from('users').update({ is_active: active }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'users'] }),
  });
}

/**
 * Réinitialise le mot de passe d'un compte — passe par `/api/reset-password`
 * (génère un mot de passe temporaire + email). Bearer via apiFetch.
 */
export function useResetPassword() {
  return useMutation({
    mutationFn: async (userId: string) => {
      const res = await apiFetch('/api/reset-password', { method: 'POST', body: JSON.stringify({ userId }) });
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(body.error || `Échec de la réinitialisation (HTTP ${res.status}).`);
      }
    },
  });
}

export type CreateUserInput = {
  name: string;
  email: string;
  username: string;
  password: string;
  role: UserRole;
  telephone?: string | null;
};

/**
 * Crée un compte du personnel — passe par `/api/create-user` (auth.admin +
 * profil + email). Le serveur applique aussi les règles de rôle.
 */
export function useCreateUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: CreateUserInput) => {
      const res = await apiFetch('/api/create-user', { method: 'POST', body: JSON.stringify(input) });
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(body.error || `Échec de la création (HTTP ${res.status}).`);
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'users'] }),
  });
}

/* ── RH : congés / paie / employés / évaluations ─────────────────────────── */
export type EmployeeInput = {
  id?: string;
  matricule?: string;
  prenom: string;
  nom: string;
  poste: string;
  departement?: string;
  telephone?: string;
  email?: string;
  salaireBase: number;
  statut: string;
};

/** Crée ou met à jour un employé — miroir `HRManagement` (sous-ensemble de champs). */
export function useUpsertEmployee() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: EmployeeInput) => {
      const payload = {
        matricule: input.matricule?.trim() || null,
        prenom: input.prenom.trim(),
        nom: input.nom.trim(),
        poste: input.poste.trim(),
        departement: input.departement?.trim() || null,
        telephone: input.telephone?.trim() || null,
        email: input.email?.trim() || null,
        salaire_base: input.salaireBase,
        statut: input.statut,
      };
      if (input.id) {
        const { error } = await supabase.from('employees').update(payload).eq('id', input.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('employees')
          .insert({ ...payload, date_embauche: new Date().toISOString().slice(0, 10) });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'employees'] });
      qc.invalidateQueries({ queryKey: ['admin', 'performance'] });
    },
  });
}

/** Change le statut d'un employé (actif / suspendu / inactif). */
export function useSetEmployeeStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, statut }: { id: string; statut: string }) => {
      const { error } = await supabase.from('employees').update({ statut }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'employees'] }),
  });
}

export function useAdminEmployees() {
  return useQuery({
    queryKey: ['admin', 'employees'],
    queryFn: async () => {
      const { data } = await supabase.from('employees').select('*').order('nom', { ascending: true });
      return (data as any[]) ?? [];
    },
    staleTime: 2 * 60 * 1000,
  });
}

export function useAdminLeaves() {
  return useQuery({
    queryKey: ['admin', 'leaves'],
    queryFn: async () => {
      const [leaves, employees] = await Promise.all([
        supabase.from('leave_requests').select('*').order('created_at', { ascending: false }),
        supabase.from('employees').select('id, nom, prenom'),
      ]);
      const names = new Map<string, string>();
      for (const e of (employees.data as any[]) ?? []) names.set(e.id, `${e.prenom ?? ''} ${e.nom ?? ''}`.trim());
      return ((leaves.data as any[]) ?? []).map((l) => ({ ...l, employeeName: names.get(l.employee_id) || 'Employé' }));
    },
    staleTime: 60 * 1000,
  });
}

export function useReviewLeave() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, approve, reviewerId }: { id: string; approve: boolean; reviewerId?: string }) => {
      const { error } = await supabase
        .from('leave_requests')
        .update({ status: approve ? 'approuve' : 'refuse', reviewed_by: reviewerId ?? null, reviewed_at: new Date().toISOString() })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'leaves'] }),
  });
}

/**
 * Génère les bulletins de paie dus — miroir `/api/hr/generate-payslips`
 * (RPC `hr_generate_due_payslips` côté serveur, moteur de paie légal Cameroun).
 * Sans paramètre = toutes les périodes dues.
 */
export function useGeneratePayslips() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (params?: { year?: number; month?: number }) => {
      const res = await apiFetch('/api/hr/generate-payslips', { method: 'POST', body: JSON.stringify(params ?? {}) });
      const data = (await res.json().catch(() => ({}))) as { generated?: unknown[]; error?: string };
      if (!res.ok) throw new Error(data.error || `Échec de la génération (HTTP ${res.status}).`);
      return { count: (data.generated ?? []).length };
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'payslips'] }),
  });
}

export function useAdminPayslips() {
  return useQuery({
    queryKey: ['admin', 'payslips'],
    queryFn: async () => {
      const [pay, employees] = await Promise.all([
        supabase.from('payslips').select('*').order('annee', { ascending: false }).order('mois', { ascending: false }).limit(60),
        supabase.from('employees').select('id, nom, prenom'),
      ]);
      const names = new Map<string, string>();
      for (const e of (employees.data as any[]) ?? []) names.set(e.id, `${e.prenom ?? ''} ${e.nom ?? ''}`.trim());
      return ((pay.data as any[]) ?? []).map((p) => ({ ...p, employeeName: names.get(p.employee_id) || 'Employé' }));
    },
    staleTime: 60 * 1000,
  });
}

/**
 * Supprime un bulletin de paie — miroir web `useDeletePayslip`. La sortie
 * comptable « salaires » liée part en cascade (FK ON DELETE CASCADE) et le
 * trigger de trésorerie retire son montant du solde → on rafraîchit compta.
 */
export function useDeleteAdminPayslip(actor?: Actor) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('payslips').delete().eq('id', id);
      if (error) throw error;
      await logActivity(actor ?? {}, 'accounting_expense', 'payslips', id, 'Bulletin de paie supprimé', {});
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'payslips'] });
      qc.invalidateQueries({ queryKey: ['admin', 'ledger'] });
      qc.invalidateQueries({ queryKey: ['admin', 'treasury'] });
    },
  });
}

export function useAdminEvaluations() {
  return useQuery({
    queryKey: ['admin', 'evaluations'],
    queryFn: async () => {
      const { data } = await supabase.from('hr_employee_evaluations').select('*').order('date_evaluation', { ascending: false });
      return (data as any[]) ?? [];
    },
    staleTime: 60 * 1000,
  });
}

/* ── Frais (paiements groupés par étudiant) ──────────────────────────────── */
export type FraisTranche = { id: string; label: string; montant: number; status: string; dateLimite: string | null };
export type FraisStudent = { studentId: string; name: string; tranches: FraisTranche[]; collected: number; late: number };

const FEE_TYPE_LABEL: Record<string, string> = {
  bourse: 'Procédure bourse',
  mandarin: 'Cours mandarin',
  anglais: 'Cours anglais',
  inscription: 'Inscription',
  autre: 'Frais',
};

/** Encaisse une tranche de frais (marque payée) — mirror encaisser/markPaid. */
export function useEncaisserTranche(actor?: Actor) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (paymentId: string) => {
      const nowIso = new Date().toISOString();
      // Relecture fraîche : idempotence (ne jamais ré-encaisser un paiement déjà
      // soldé → sinon double écriture comptable) + montants réels.
      const { data: payment, error: fErr } = await supabase
        .from('payments')
        .select('*, students(nom, prenom)')
        .eq('id', paymentId)
        .single();
      if (fErr || !payment) throw fErr ?? new Error('Paiement introuvable');
      if (payment.status === 'paye') return; // déjà encaissé — no-op

      const montantPaye = Number(payment.montant_paye ?? 0);
      const validatedAmount = Math.max(0, Number(payment.montant) - montantPaye);
      if (validatedAmount <= 0) return; // rien à encaisser
      const newMontantPaye = montantPaye + validatedAmount;

      const { error: uErr } = await supabase
        .from('payments')
        .update({
          status: 'paye',
          montant_paye: newMontantPaye,
          montant_declare: 0,
          date_paiement: nowIso,
          validated_by: actor?.id ?? null,
          validated_at: nowIso,
        })
        .eq('id', paymentId);
      if (uErr) throw uErr;

      // Écriture comptable (miroir web `PaymentsPage.handleValidate` et staff
      // `useValidatePayment`) — sans elle, l'argent encaissé n'apparaît jamais
      // dans le livre comptable.
      const typeEntree = payment.type === 'mandarin' || payment.type === 'anglais' ? 'paiement_cours' : 'paiement_procedure';
      const studentName = payment.students ? `${payment.students.nom} ${payment.students.prenom}` : 'Étudiant';
      const deviseEntree = String(payment.type).endsWith('_intl') ? 'USD' : 'FCFA';
      const { error: eErr } = await supabase.from('entrees_comptables').insert({
        montant: validatedAmount,
        date: nowIso,
        type: typeEntree,
        description: `Paiement ${payment.type} - Tranche ${payment.tranche || 'N/A'} - ${studentName}`,
        devise: deviseEntree,
        student_id: payment.student_id,
        payment_id: payment.id,
        created_by: actor?.id ?? null,
      });
      if (eErr) throw eErr;

      await logActivity(actor ?? {}, 'payment_validate', 'payments', paymentId, 'Tranche de frais encaissée', { payment_id: paymentId, montant: validatedAmount });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'frais'] });
      qc.invalidateQueries({ queryKey: ['admin', 'ledger'] });
      qc.invalidateQueries({ queryKey: ['admin', 'dashboard'] });
      qc.invalidateQueries({ queryKey: ['admin', 'treasury'] });
    },
  });
}

export function useFrais() {
  return useQuery({
    queryKey: ['admin', 'frais'],
    queryFn: async (): Promise<FraisStudent[]> => {
      const [pays, students] = await Promise.all([
        supabase.from('payments').select('id, student_id, type, tranche, montant, montant_paye, status, date_limite').order('created_at', { ascending: false }),
        supabase.from('students').select('id, nom, prenom'),
      ]);
      const names = new Map<string, string>();
      for (const s of (students.data as any[]) ?? []) names.set(s.id, `${s.prenom ?? ''} ${s.nom ?? ''}`.trim());
      const byStudent = new Map<string, FraisStudent>();
      for (const p of (pays.data as any[]) ?? []) {
        if (!byStudent.has(p.student_id)) {
          byStudent.set(p.student_id, { studentId: p.student_id, name: names.get(p.student_id) || 'Étudiant', tranches: [], collected: 0, late: 0 });
        }
        const fs = byStudent.get(p.student_id)!;
        fs.tranches.push({
          id: p.id,
          label: `${FEE_TYPE_LABEL[p.type] ?? p.type}${p.tranche ? ` · T${p.tranche}` : ''}`,
          montant: Number(p.montant || 0),
          status: p.status,
          dateLimite: p.date_limite,
        });
        fs.collected += Number(p.montant_paye ?? (p.status === 'paye' ? p.montant : 0));
        if (p.status === 'retard') fs.late += Number(p.montant || 0);
      }
      return [...byStudent.values()];
    },
    staleTime: 60 * 1000,
  });
}

/* ── Performances ─────────────────────────────────────────────────────────
   Port fidèle du moteur web (PerformanceHistory.tsx + lib/hrPerformance.ts) :
   - Agents : score composite Revenu 40 % + Activité 25 % + Rapidité 20 %
     + Dossier 15 %, chaque composante normalisée vs le meilleur agent.
   - Employés : indice = 70 % notation (note_globale /5 → /100) + 30 % régularité
     des rapports (nb + heures, normalisés).
   - Filtrage par période identique (date_paiement|created_at ≥ début).
   ─────────────────────────────────────────────────────────────────────────── */
export type Period = 'week' | 'month' | 'quarter' | 'year' | 'all';
export type AgentTypeStat = { c: number; a: number };
export type AgentPerf = {
  id: string;
  name: string;
  role: string;
  rank: number;
  students: number;
  dossiers: number;
  score: number;
  revenue: number;
  avgValidationDays: number | null;
  breakdown: { revenue: number; activity: number; speed: number; dossier: number };
  types: { bourse: AgentTypeStat; mandarin: AgentTypeStat; anglais: AgentTypeStat };
  alerts: { validation: number; attente: number; retard: number };
};
export type EmployeePerf = { rank: number; name: string; dept: string; index: number; rating: number; evals: number; reports: number; hours: number };
export type DailyPerf = { date: string; total: number; courses: { c: number; a: number }; proc: { c: number; a: number } };
export type AdminPerformance = {
  revenue: number;
  enValidation: number;
  avgIndex: number;
  agents: AgentPerf[];
  employees: EmployeePerf[];
  daily: DailyPerf[];
};

const STAFF_BASE_ROLES = new Set(['agent', 'supervisor', 'user']);
const COURSE_TYPES = new Set(['mandarin', 'anglais', 'inscription']);
const EVAL_SCORE_MAX = 5;
const SCORE_WEIGHTS = { revenue: 0.4, activity: 0.25, speed: 0.2, dossier: 0.15 } as const;

function periodStartOf(period: Period): Date | null {
  if (period === 'all') return null;
  const d = new Date();
  if (period === 'week') d.setDate(d.getDate() - 7);
  else if (period === 'month') d.setMonth(d.getMonth() - 1);
  else if (period === 'quarter') d.setMonth(d.getMonth() - 3);
  else d.setFullYear(d.getFullYear() - 1);
  return d;
}
function norm(value: number, max: number): number {
  return max > 0 ? Math.min(value / max, 1) : 0;
}

export type EvaluationNotes = {
  qualite: number;
  productivite: number;
  ponctualite: number;
  equipe: number;
  communication: number;
  initiative: number;
  discipline: number;
};

/**
 * Crée une évaluation employé — miroir `HRManagement` : 7 notes /5 + note
 * globale (moyenne). Insère dans `hr_employee_evaluations`.
 */
export function useCreateEvaluation(actor?: Actor) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ employeeId, notes, commentaire }: { employeeId: string; notes: EvaluationNotes; commentaire?: string }) => {
      const vals = [notes.qualite, notes.productivite, notes.ponctualite, notes.equipe, notes.communication, notes.initiative, notes.discipline];
      const globale = Math.round((vals.reduce((a, b) => a + b, 0) / vals.length) * 100) / 100;
      const { error } = await supabase.from('hr_employee_evaluations').insert({
        employee_id: employeeId,
        date_evaluation: new Date().toISOString().slice(0, 10),
        note_qualite: notes.qualite,
        note_productivite: notes.productivite,
        note_ponctualite: notes.ponctualite,
        note_equipe: notes.equipe,
        note_communication: notes.communication,
        note_initiative: notes.initiative,
        note_discipline: notes.discipline,
        note_globale: globale,
        commentaire: commentaire?.trim() || null,
        created_by: actor?.id ?? null,
      });
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'performance'] }),
  });
}

export function useAdminPerformance(period: Period = 'month') {
  return useQuery({
    queryKey: ['admin', 'performance', period],
    queryFn: async (): Promise<AdminPerformance> => {
      const start = periodStartOf(period);

      const [usersR, paysR, studentsR, dossiersR, logsR, historyR, employeesR, evalsR, reportsR] = await Promise.all([
        supabase.from('users').select('id, name, username, role'),
        supabase.from('payments').select('student_id, montant, penalites, type, status, created_at, date_paiement, validated_by, validated_at'),
        supabase.from('students').select('id, created_by'),
        supabase.from('dossier_bourses').select('id, student_id'),
        supabase.from('activity_logs').select('user_id, activity_type, created_at').not('activity_type', 'in', '(login,logout,config_update)').order('created_at', { ascending: false }).limit(5000),
        supabase.from('dossier_history').select('performed_by, performed_at').order('performed_at', { ascending: false }).limit(5000),
        supabase.from('employees').select('id, nom, prenom, poste'),
        supabase.from('hr_employee_evaluations').select('employee_id, note_globale, date_evaluation'),
        supabase.from('daily_reports').select('employee_id, heures_travaillees, date'),
      ]);

      const users = (usersR.data as any[]) ?? [];
      const allPays = (paysR.data as any[]) ?? [];
      const studentsById = new Map<string, { created_by: string | null }>();
      for (const s of (studentsR.data as any[]) ?? []) studentsById.set(s.id, { created_by: s.created_by });
      const creatorSet = new Set([...studentsById.values()].map((s) => s.created_by).filter(Boolean) as string[]);

      const inPeriod = (p: any) => !start || new Date(p.date_paiement || p.created_at) >= start;
      const payePays = allPays.filter((p) => p.status === 'paye' && inPeriod(p));
      const enValPays = allPays.filter((p) => p.status === 'en_validation');
      const attentePays = allPays.filter((p) => p.status === 'attente');
      const retardPays = allPays.filter((p) => p.status === 'retard');

      const revenueTotal = payePays.reduce((s, p) => s + Number(p.montant || 0), 0);

      // ── Agrégats par agent ──────────────────────────────────────────────────
      type Acc = {
        id: string; name: string; role: string;
        revenue: number; students: number; dossiers: number; activity: number; dossierActions: number;
        types: { bourse: AgentTypeStat; mandarin: AgentTypeStat; anglais: AgentTypeStat };
        alerts: { validation: number; attente: number; retard: number };
        delays: number[];
      };
      const acc = new Map<string, Acc>();
      const make = (u: any): Acc => ({
        id: u.id, name: u.name || u.username || u.id, role: u.role,
        revenue: 0, students: 0, dossiers: 0, activity: 0, dossierActions: 0,
        types: { bourse: { c: 0, a: 0 }, mandarin: { c: 0, a: 0 }, anglais: { c: 0, a: 0 } },
        alerts: { validation: 0, attente: 0, retard: 0 }, delays: [],
      });
      for (const u of users) {
        if (STAFF_BASE_ROLES.has(u.role)) acc.set(u.id, make(u));
        else if (u.role !== 'student' && creatorSet.has(u.id)) acc.set(u.id, make(u));
      }

      for (const p of payePays) {
        const agentId = studentsById.get(p.student_id)?.created_by;
        if (!agentId || !acc.has(agentId)) continue;
        const e = acc.get(agentId)!;
        const amt = Number(p.montant || 0);
        e.revenue += amt;
        if (p.type === 'bourse') { e.types.bourse.c++; e.types.bourse.a += amt; }
        else if (p.type === 'mandarin') { e.types.mandarin.c++; e.types.mandarin.a += amt; }
        else if (p.type === 'anglais') { e.types.anglais.c++; e.types.anglais.a += amt; }
        if (p.validated_by && p.validated_at) {
          const days = (new Date(p.validated_at).getTime() - new Date(p.created_at).getTime()) / 86_400_000;
          if (days >= 0) acc.get(p.validated_by)?.delays.push(days);
        }
      }
      for (const p of [...enValPays, ...attentePays, ...retardPays]) {
        const agentId = studentsById.get(p.student_id)?.created_by;
        if (!agentId || !acc.has(agentId)) continue;
        const e = acc.get(agentId)!;
        if (p.status === 'en_validation') e.alerts.validation++;
        else if (p.status === 'attente') e.alerts.attente++;
        else e.alerts.retard++;
      }
      for (const s of studentsById.values()) if (s.created_by && acc.has(s.created_by)) acc.get(s.created_by)!.students++;
      for (const d of (dossiersR.data as any[]) ?? []) {
        const agentId = studentsById.get(d.student_id)?.created_by;
        if (agentId && acc.has(agentId)) acc.get(agentId)!.dossiers++;
      }
      for (const log of (logsR.data as any[]) ?? []) {
        if (start && new Date(log.created_at) < start) continue;
        if (acc.has(log.user_id)) acc.get(log.user_id)!.activity++;
      }
      for (const h of (historyR.data as any[]) ?? []) {
        if (!h.performed_by) continue;
        if (start && new Date(h.performed_at) < start) continue;
        if (acc.has(h.performed_by)) acc.get(h.performed_by)!.dossierActions++;
      }

      const all = [...acc.values()];
      const maxRevenue = Math.max(1, ...all.map((a) => a.revenue));
      const maxActivity = Math.max(1, ...all.map((a) => a.activity));
      const maxDossierActions = Math.max(1, ...all.map((a) => a.dossierActions));
      const avgDelay = (a: Acc) => (a.delays.length ? a.delays.reduce((s, d) => s + d, 0) / a.delays.length : null);
      const maxDelay = Math.max(1, ...all.map(avgDelay).filter((d): d is number => d !== null));

      const scored: AgentPerf[] = all.map((a) => {
        const delay = avgDelay(a);
        const rScore = norm(a.revenue, maxRevenue) * 100;
        const aScore = norm(a.activity, maxActivity) * 100;
        const sScore = delay !== null ? (1 - norm(delay, maxDelay)) * 100 : 50;
        const dScore = norm(a.dossierActions, maxDossierActions) * 100;
        const composite = Math.round(SCORE_WEIGHTS.revenue * rScore + SCORE_WEIGHTS.activity * aScore + SCORE_WEIGHTS.speed * sScore + SCORE_WEIGHTS.dossier * dScore);
        return {
          id: a.id, name: a.name, role: a.role, rank: 0,
          students: a.students, dossiers: a.dossiers, score: composite, revenue: a.revenue,
          avgValidationDays: delay,
          breakdown: { revenue: Math.round(rScore), activity: Math.round(aScore), speed: Math.round(sScore), dossier: Math.round(dScore) },
          types: a.types, alerts: a.alerts,
        };
      });
      const active = scored.filter((a) => a.score > 0 || a.breakdown.activity > 0 || a.revenue > 0).sort((a, b) => b.score - a.score);
      const inactive = scored.filter((a) => !(a.score > 0 || a.breakdown.activity > 0 || a.revenue > 0)).sort((a, b) => a.name.localeCompare(b.name, 'fr'));
      const agents = [...active, ...inactive].map((a, i) => ({ ...a, rank: i + 1 }));

      // ── Employés : notation 70 % + rapports 30 % (computeEmployeePerformance) ─
      const evalsInPeriod = ((evalsR.data as any[]) ?? []).filter((ev) => !start || new Date(ev.date_evaluation) >= start);
      const reportsInPeriod = ((reportsR.data as any[]) ?? []).filter((r) => !start || new Date(r.date) >= start);
      const empMap = new Map<string, { name: string; dept: string }>();
      for (const e of (employeesR.data as any[]) ?? []) empMap.set(e.id, { name: `${e.prenom ?? ''} ${e.nom ?? ''}`.trim(), dept: e.poste ?? '' });

      const evalByEmp = new Map<string, number[]>();
      for (const ev of evalsInPeriod) {
        const arr = evalByEmp.get(ev.employee_id) ?? [];
        arr.push(Number(ev.note_globale || 0));
        evalByEmp.set(ev.employee_id, arr);
      }
      const repByEmp = new Map<string, { count: number; hours: number }>();
      for (const r of reportsInPeriod) {
        const cur = repByEmp.get(r.employee_id) ?? { count: 0, hours: 0 };
        cur.count++;
        cur.hours += Number(r.heures_travaillees || 0);
        repByEmp.set(r.employee_id, cur);
      }
      const empIds = new Set<string>([...evalByEmp.keys(), ...repByEmp.keys()]);
      const base = [...empIds].map((id) => {
        const evals = evalByEmp.get(id) ?? [];
        const rep = repByEmp.get(id) ?? { count: 0, hours: 0 };
        const evalAvg = evals.length ? evals.reduce((s, v) => s + v, 0) / evals.length : 0;
        return { id, evals: evals.length, evalAvg, reportCount: rep.count, hours: rep.hours };
      });
      const maxCount = Math.max(0, ...base.map((b) => b.reportCount));
      const maxHours = Math.max(0, ...base.map((b) => b.hours));
      const employeesPerf: EmployeePerf[] = base
        .map((b) => {
          const hasNotation = b.evals > 0;
          const hasReports = b.reportCount > 0;
          const notationScore = hasNotation ? (b.evalAvg / EVAL_SCORE_MAX) * 100 : null;
          const reportScore = (0.5 * norm(b.reportCount, maxCount) + 0.5 * norm(b.hours, maxHours)) * 100;
          let index: number;
          if (hasNotation && hasReports) index = 0.7 * (notationScore as number) + 0.3 * reportScore;
          else if (hasNotation) index = notationScore as number;
          else index = reportScore;
          const info = empMap.get(b.id);
          return { rank: 0, name: info?.name || 'Employé', dept: info?.dept || '', index: Math.round(index), rating: b.evalAvg, evals: b.evals, reports: b.reportCount, hours: b.hours };
        })
        .sort((a, b) => b.index - a.index)
        .map((e, i) => ({ ...e, rank: i + 1 }));
      const avgIndex = employeesPerf.length ? Math.round(employeesPerf.reduce((s, e) => s + e.index, 0) / employeesPerf.length) : 0;

      // ── Journalier : paye payments par jour, cours vs procédures ─────────────
      const dayGroups = new Map<string, any[]>();
      for (const p of payePays) {
        const key = new Date(p.date_paiement || p.created_at).toISOString().split('T')[0];
        (dayGroups.get(key) ?? dayGroups.set(key, []).get(key)!).push(p);
      }
      const daily: DailyPerf[] = [...dayGroups.keys()]
        .sort((a, b) => new Date(b).getTime() - new Date(a).getTime())
        .map((key) => {
          const dp = dayGroups.get(key)!;
          const courses = dp.filter((p) => COURSE_TYPES.has(p.type));
          const proc = dp.filter((p) => !COURSE_TYPES.has(p.type));
          const today = new Date().toISOString().split('T')[0];
          const yest = new Date(Date.now() - 86_400_000).toISOString().split('T')[0];
          const label = key === today ? "Aujourd'hui" : key === yest ? 'Hier' : new Date(key + 'T12:00:00').toLocaleDateString('fr-FR', { weekday: 'short', day: '2-digit', month: 'short' });
          return {
            date: label,
            total: dp.reduce((s, p) => s + Number(p.montant || 0), 0),
            courses: { c: courses.length, a: courses.reduce((s, p) => s + Number(p.montant || 0), 0) },
            proc: { c: proc.length, a: proc.reduce((s, p) => s + Number(p.montant || 0), 0) },
          };
        });

      return { revenue: revenueTotal, enValidation: enValPays.length, avgIndex, agents, employees: employeesPerf, daily };
    },
    staleTime: 2 * 60 * 1000,
  });
}

/* ── Configuration des frais (table payment_config) ──────────────────────── */
export type PaymentConfigRow = {
  service_type: string;
  label: string;
  tranches: { tranche: number; label: string; montant: number }[];
  grace_days: number;
  daily_penalty: number;
  deadline_offset_days: number;
};

export function usePaymentConfigs() {
  return useQuery({
    queryKey: ['admin', 'payment_config'],
    queryFn: async (): Promise<PaymentConfigRow[]> => {
      const { data, error } = await supabase.from('payment_config').select('*').order('service_type', { ascending: true });
      if (error) throw error;
      return ((data as any[]) ?? []).map((c) => ({
        service_type: c.service_type,
        label: c.label,
        tranches: Array.isArray(c.tranches) ? c.tranches : [],
        grace_days: Number(c.grace_days ?? 0),
        daily_penalty: Number(c.daily_penalty ?? 0),
        deadline_offset_days: Number(c.deadline_offset_days ?? 0),
      }));
    },
    staleTime: 5 * 60 * 1000,
  });
}

/* ── Stockage (approximation buckets) ────────────────────────────────────── */
export function useStorageStats() {
  return useQuery({
    queryKey: ['admin', 'storage'],
    queryFn: async () => {
      const [docs, pays, slips] = await Promise.all([
        supabase.from('documents').select('id', { count: 'exact', head: true }),
        supabase.from('payments').select('id', { count: 'exact', head: true }).not('facture_url', 'is', null),
        supabase.from('payslips').select('id', { count: 'exact', head: true }),
      ]);
      return {
        documents: docs.count ?? 0,
        justificatifs: pays.count ?? 0,
        payslips: slips.count ?? 0,
      };
    },
    staleTime: 5 * 60 * 1000,
  });
}
