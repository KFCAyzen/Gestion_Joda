import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { supabase } from '../supabase';
import type { DossierStatus } from './use-student-portal';

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
        supabase.from('entrees_comptables').select('montant, date').gte('date', startMonth),
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
};
export type Ledger = {
  solde: number;
  entrees: number;
  sorties: number;
  toValidate: number;
  rows: LedgerRow[];
};

function isValidated(s: { status?: string | null; validated_at?: string | null }): boolean {
  if (s.status) return s.status === 'validated';
  return !!s.validated_at;
}

export function useAccountingLedger() {
  return useQuery({
    queryKey: ['admin', 'ledger'],
    queryFn: async (): Promise<Ledger> => {
      const [entRes, sorRes] = await Promise.all([
        supabase.from('entrees_comptables').select('*').order('date', { ascending: false }).limit(100),
        supabase.from('sorties_comptables').select('*').order('date', { ascending: false }).limit(100),
      ]);
      const ent = (entRes.data as any[]) ?? [];
      const sor = (sorRes.data as any[]) ?? [];

      const entrees = ent.reduce((s, e) => s + Number(e.montant || 0), 0);
      const sortiesValid = sor.filter(isValidated).reduce((s, x) => s + Number(x.montant || 0), 0);
      const toValidate = sor.filter((s) => !isValidated(s)).length;

      const rows: LedgerRow[] = [
        ...ent.map((e) => ({
          id: e.id,
          kind: 'in' as const,
          date: e.date,
          desc: e.description ?? 'Entrée',
          cat: e.type ?? 'Divers',
          montant: Number(e.montant || 0),
          needsValidation: false,
        })),
        ...sor.map((s) => ({
          id: s.id,
          kind: 'out' as const,
          date: s.date,
          desc: s.description ?? 'Sortie',
          cat: s.categorie ?? 'Divers',
          montant: Number(s.montant || 0),
          needsValidation: !isValidated(s),
        })),
      ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

      return { solde: entrees - sortiesValid, entrees, sorties: sortiesValid, toValidate, rows };
    },
    staleTime: 60 * 1000,
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

/* ── Candidatures (dossier_bourses + étudiant) ───────────────────────────── */
export type Candidature = {
  id: string;
  studentId: string;
  name: string;
  program: string;
  status: DossierStatus;
  createdAt: string;
};

export function useCandidatures() {
  return useQuery({
    queryKey: ['admin', 'candidatures'],
    queryFn: async (): Promise<Candidature[]> => {
      const [dos, students] = await Promise.all([
        supabase.from('dossier_bourses').select('id, student_id, status, desired_program, created_at').order('created_at', { ascending: false }).limit(200),
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
        createdAt: d.created_at,
      }));
    },
    staleTime: 60 * 1000,
  });
}

/* ── Cours de langues (à partir des paiements mandarin/anglais) ──────────── */
export type CourseStats = { active: number; revenue: number };
export function useLanguageCourses() {
  return useQuery({
    queryKey: ['admin', 'courses'],
    queryFn: async (): Promise<{ mandarin: CourseStats; anglais: CourseStats }> => {
      const { data } = await supabase.from('payments').select('type, montant, montant_paye, status, student_id').in('type', ['mandarin', 'anglais']);
      const rows = (data as any[]) ?? [];
      const calc = (t: string): CourseStats => {
        const sub = rows.filter((r) => r.type === t);
        const active = new Set(sub.map((r) => r.student_id)).size;
        const revenue = sub.reduce((s, r) => s + Number(r.montant_paye ?? (r.status === 'paye' ? r.montant : 0)), 0);
        return { active, revenue };
      };
      return { mandarin: calc('mandarin'), anglais: calc('anglais') };
    },
    staleTime: 2 * 60 * 1000,
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

/* ── RH : congés / paie / employés / évaluations ─────────────────────────── */
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

/* ── Performances (agents / employés / journalier) ──────────────────────── */
export type AgentPerf = {
  id: string;
  name: string;
  role: string;
  rank: number;
  students: number;
  dossiers: number;
  score: number;
  revenue: number;
};
export type EmployeePerf = { rank: number; name: string; dept: string; index: number; rating: number; evals: number; reports: number };
export type DailyPerf = { date: string; total: number; courses: { c: number; a: number }; proc: { c: number; a: number } };
export type AdminPerformance = {
  revenue: number;
  avgIndex: number;
  agents: AgentPerf[];
  employees: EmployeePerf[];
  daily: DailyPerf[];
};

const STAFF_ROLES = ['agent', 'supervisor', 'user', 'admin'];

export function useAdminPerformance() {
  return useQuery({
    queryKey: ['admin', 'performance'],
    queryFn: async (): Promise<AdminPerformance> => {
      const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString();
      const [users, entrees, dossiers, students, evals, reports, employees] = await Promise.all([
        supabase.from('users').select('id, name, role').in('role', STAFF_ROLES),
        supabase.from('entrees_comptables').select('montant, type, created_by, date').gte('date', monthStart),
        supabase.from('dossier_bourses').select('created_by'),
        supabase.from('students').select('created_by'),
        supabase.from('hr_employee_evaluations').select('employee_id, note_globale, note'),
        supabase.from('daily_reports').select('employee_id, heures_travaillees, date'),
        supabase.from('employees').select('id, nom, prenom, poste'),
      ]);

      const entRows = (entrees.data as any[]) ?? [];
      const revenueTotal = entRows.reduce((s, e) => s + Number(e.montant || 0), 0);

      // Agents : revenu encaissé / créateur.
      const revByUser = new Map<string, number>();
      for (const e of entRows) if (e.created_by) revByUser.set(e.created_by, (revByUser.get(e.created_by) ?? 0) + Number(e.montant || 0));
      const dosByUser = new Map<string, number>();
      for (const d of (dossiers.data as any[]) ?? []) if (d.created_by) dosByUser.set(d.created_by, (dosByUser.get(d.created_by) ?? 0) + 1);
      const stuByUser = new Map<string, number>();
      for (const s of (students.data as any[]) ?? []) if (s.created_by) stuByUser.set(s.created_by, (stuByUser.get(s.created_by) ?? 0) + 1);

      const maxRev = Math.max(1, ...[...revByUser.values()]);
      const agents: AgentPerf[] = ((users.data as any[]) ?? [])
        .map((u) => {
          const revenue = revByUser.get(u.id) ?? 0;
          return {
            id: u.id,
            name: u.name,
            role: u.role,
            rank: 0,
            students: stuByUser.get(u.id) ?? 0,
            dossiers: dosByUser.get(u.id) ?? 0,
            score: Math.round((revenue / maxRev) * 100),
            revenue,
          };
        })
        .sort((a, b) => b.score - a.score)
        .map((a, i) => ({ ...a, rank: i + 1 }));

      // Employés : index via évaluations + rapports.
      const empMap = new Map<string, { name: string; dept: string }>();
      for (const e of (employees.data as any[]) ?? []) empMap.set(e.id, { name: `${e.prenom ?? ''} ${e.nom ?? ''}`.trim(), dept: e.poste ?? '' });
      const ratingByEmp = new Map<string, { sum: number; n: number }>();
      for (const ev of (evals.data as any[]) ?? []) {
        const v = Number(ev.note_globale ?? ev.note ?? 0);
        if (!v) continue;
        const cur = ratingByEmp.get(ev.employee_id) ?? { sum: 0, n: 0 };
        cur.sum += v;
        cur.n += 1;
        ratingByEmp.set(ev.employee_id, cur);
      }
      const reportsByEmp = new Map<string, number>();
      for (const r of (reports.data as any[]) ?? []) reportsByEmp.set(r.employee_id, (reportsByEmp.get(r.employee_id) ?? 0) + 1);

      const employeesPerf: EmployeePerf[] = [...empMap.entries()]
        .map(([id, e]) => {
          const rt = ratingByEmp.get(id);
          const rating = rt && rt.n ? rt.sum / rt.n : 0;
          const ratingOn5 = rating > 5 ? rating / 4 : rating; // tolère note /20
          const reportsCount = reportsByEmp.get(id) ?? 0;
          const index = Math.min(100, Math.round((ratingOn5 / 5) * 70 + Math.min(reportsCount, 20) * 1.5));
          return { rank: 0, name: e.name, dept: e.dept, index, rating: ratingOn5, evals: rt?.n ?? 0, reports: reportsCount };
        })
        .sort((a, b) => b.index - a.index)
        .map((e, i) => ({ ...e, rank: i + 1 }));

      const avgIndex = employeesPerf.length ? Math.round(employeesPerf.reduce((s, e) => s + e.index, 0) / employeesPerf.length) : 0;

      // Journalier : entrées des 3 derniers jours, cours vs procédures.
      const daily: DailyPerf[] = [];
      for (let i = 0; i < 3; i++) {
        const day = new Date(Date.now() - i * 86_400_000);
        const dayRows = entRows.filter((e) => new Date(e.date).toDateString() === day.toDateString());
        const courses = dayRows.filter((e) => String(e.type).includes('cours'));
        const proc = dayRows.filter((e) => !String(e.type).includes('cours'));
        daily.push({
          date: i === 0 ? "Aujourd'hui" : i === 1 ? 'Hier' : day.toLocaleDateString('fr-FR', { weekday: 'short', day: '2-digit' }),
          total: dayRows.reduce((s, e) => s + Number(e.montant || 0), 0),
          courses: { c: courses.length, a: courses.reduce((s, e) => s + Number(e.montant || 0), 0) },
          proc: { c: proc.length, a: proc.reduce((s, e) => s + Number(e.montant || 0), 0) },
        });
      }

      return { revenue: revenueTotal, avgIndex, agents, employees: employeesPerf, daily };
    },
    staleTime: 2 * 60 * 1000,
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
