import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { supabase } from '../supabase';
import { apiFetch } from '../api';
import { buildMilestones, DOSSIER_TRANSITIONS, type Milestone } from '../dossier-milestones';
import { REQUIRED_DOCS, REQUIRED_KEYS } from '../required-docs';
import { logActivity } from '../activity-log';
import { buildStudentUsername, buildStudentAuthEmail, generateTemporaryPassword } from '../student-auth';
import { DEFAULT_PAYMENT_CONFIGS, getBourseServiceType, isInternational } from '../payment-config';
import type { DossierStatus } from './use-student-portal';

type Actor = { id?: string | null; name?: string | null; role?: string | null };

/* ============================================================
   Hooks de l'app Agent — composent les vraies données Supabase
   (students, dossier_bourses, payments, documents, daily_reports).
   ============================================================ */

export type Bucket = 'now' | 'review' | 'done';

export type StaffDossier = {
  id: string; // student id
  name: string;
  program: string;
  status: DossierStatus | null;
  statusLabel: string;
  chip: 'live' | 'due' | 'done';
  bucket: Bucket;
  pct: number;
  step: number;
  stepLabel: string;
  docsDone: number;
  docsTotal: number;
  paid: number;
  due: number;
  dest: string;
};

const STATUS_LABEL: Record<DossierStatus, string> = {
  document_manquant: 'À traiter',
  en_attente: 'À traiter',
  en_attente_universite: 'À traiter',
  document_recu: 'En revue',
  en_cours: 'En revue',
  visa_en_cours: 'En revue',
  admission_validee: 'Complet',
  admission_rejetee: 'Rejeté',
  termine: 'Complet',
};

function bucketFor(status: DossierStatus | null): Bucket {
  if (!status) return 'now';
  if (['admission_validee', 'termine'].includes(status)) return 'done';
  if (['document_recu', 'en_cours', 'visa_en_cours'].includes(status)) return 'review';
  return 'now';
}

const CHIP: Record<Bucket, 'live' | 'due' | 'done'> = { now: 'live', review: 'due', done: 'done' };

type StudentRow = { id: string; nom: string; prenom: string; filiere?: string | null; niveau?: string | null; choix?: string | null; created_at: string };
type DossierRow = { id: string; student_id: string; status: DossierStatus; desired_program?: string | null; study_level?: string | null; created_at: string };
type PayRow = { id: string; student_id: string; montant: number; montant_paye?: number | null; status: string };
type DocRow = { student_id: string; type: string };

function compose(student: StudentRow, dossier: DossierRow | undefined, pays: PayRow[], docs: DocRow[]): StaffDossier {
  const status = dossier?.status ?? null;
  const milestones = buildMilestones(status ?? undefined);
  const done = milestones.filter((m) => m.state === 'done').length;
  const nowIdx = milestones.findIndex((m) => m.state === 'now');
  const step = nowIdx >= 0 ? nowIdx + 1 : milestones.length;
  const pct = Math.round((done / milestones.length) * 100);
  const stepLabel = milestones[nowIdx]?.label ?? 'Terminé';

  const myDocs = new Set(docs.filter((d) => d.student_id === student.id).map((d) => d.type));
  const docsDone = REQUIRED_KEYS.filter((k) => myDocs.has(k)).length;

  const myPays = pays.filter((p) => p.student_id === student.id);
  let paid = 0;
  let due = 0;
  for (const p of myPays) {
    const mp = Number(p.montant_paye ?? 0);
    paid += mp || (p.status === 'paye' ? p.montant : 0);
    if (p.status !== 'paye' && p.status !== 'annule') due += Math.max(0, p.montant - mp);
  }

  const bucket = bucketFor(status);
  return {
    id: student.id,
    name: `${student.prenom ?? ''} ${student.nom ?? ''}`.trim() || 'Étudiant',
    program: dossier?.desired_program || student.filiere || student.choix || 'Dossier étudiant',
    status,
    statusLabel: status ? STATUS_LABEL[status] : 'À traiter',
    chip: CHIP[bucket],
    bucket,
    pct,
    step,
    stepLabel,
    docsDone,
    docsTotal: REQUIRED_KEYS.length,
    paid,
    due,
    dest: dossier?.study_level || student.niveau || '—',
  };
}

/** Liste des dossiers suivis (composée côté client). */
export function useStaffDossiers() {
  return useQuery({
    queryKey: ['staff', 'dossiers'],
    queryFn: async (): Promise<StaffDossier[]> => {
      const [students, dossiers, pays, docs] = await Promise.all([
        supabase.from('students').select('id, nom, prenom, filiere, niveau, choix, created_at').order('created_at', { ascending: false }).limit(200),
        supabase.from('dossier_bourses').select('id, student_id, status, desired_program, study_level, created_at').order('created_at', { ascending: false }),
        supabase.from('payments').select('id, student_id, montant, montant_paye, status'),
        supabase.from('documents').select('student_id, type'),
      ]);
      if (students.error) throw students.error;

      // Dernier dossier par étudiant (déjà trié desc).
      const latest = new Map<string, DossierRow>();
      for (const d of (dossiers.data as DossierRow[]) ?? []) {
        if (!latest.has(d.student_id)) latest.set(d.student_id, d);
      }
      const payRows = (pays.data as PayRow[]) ?? [];
      const docRows = (docs.data as DocRow[]) ?? [];
      return ((students.data as StudentRow[]) ?? []).map((s) => compose(s, latest.get(s.id), payRows, docRows));
    },
    staleTime: 60 * 1000,
  });
}

/* ── Détail d'une fiche étudiant ─────────────────────────────────────────── */
export type StaffStudentDetail = {
  id: string;
  name: string;
  /** Champs bruts éditables (préremplissage du formulaire). */
  firstName: string;
  lastName: string;
  level: string;
  ref: string;
  program: string;
  dest: string;
  /** Dossier bourse lié (pour le changement de statut) — null si aucun. */
  dossierId: string | null;
  status: DossierStatus | null;
  pct: number;
  step: number;
  stepLabel: string;
  milestones: Milestone[];
  docs: { key: string; label: string; ok: boolean; optional: boolean }[];
  docsDone: number;
  docsTotal: number;
  paid: number;
  due: number;
  peerUserId: string | null;
  phone: string | null;
  nationalite: string | null;
  /** Lignes de frais (tranches) individuelles, pour édition/suppression admin. */
  installments: { id: string; type: string; tranche: number | null; montant: number; status: string; date_limite: string | null }[];
};

export function useStaffStudentDetail(studentId?: string) {
  return useQuery({
    queryKey: ['staff', 'student', studentId],
    queryFn: async (): Promise<StaffStudentDetail | null> => {
      const [stuRes, dosRes, docRes, payRes] = await Promise.all([
        supabase.from('students').select('id, nom, prenom, filiere, niveau, choix, telephone, user_id, created_by, nationalite').eq('id', studentId!).single(),
        supabase.from('dossier_bourses').select('id, status, desired_program, study_level, created_at').eq('student_id', studentId!).order('created_at', { ascending: false }).limit(1).maybeSingle(),
        supabase.from('documents').select('type').eq('student_id', studentId!),
        supabase.from('payments').select('id, type, tranche, montant, montant_paye, status, date_limite').eq('student_id', studentId!).order('type').order('tranche'),
      ]);
      if (stuRes.error || !stuRes.data) throw stuRes.error ?? new Error('Étudiant introuvable');
      const s = stuRes.data as any;
      const dossier = dosRes.data as { id: string; status: DossierStatus; desired_program?: string; study_level?: string } | null;
      const status = dossier?.status ?? null;
      const milestones = buildMilestones(status ?? undefined);
      const done = milestones.filter((m) => m.state === 'done').length;
      const nowIdx = milestones.findIndex((m) => m.state === 'now');

      const present = new Set(((docRes.data as { type: string }[]) ?? []).map((d) => d.type));
      const docs = REQUIRED_DOCS.map((d) => ({ key: d.key, label: d.label, ok: present.has(d.key), optional: d.optional }));
      const docsRequired = REQUIRED_DOCS.filter((d) => !d.optional);
      const docsDone = docsRequired.filter((d) => present.has(d.key)).length;

      let paid = 0;
      let due = 0;
      const payRows = (payRes.data as { id: string; type: string; tranche: number | null; montant: number; montant_paye?: number | null; status: string; date_limite: string | null }[]) ?? [];
      for (const p of payRows) {
        const mp = Number(p.montant_paye ?? 0);
        paid += mp || (p.status === 'paye' ? p.montant : 0);
        if (p.status !== 'paye' && p.status !== 'annule') due += Math.max(0, p.montant - mp);
      }
      const installments = payRows.map((p) => ({
        id: p.id, type: p.type, tranche: p.tranche, montant: p.montant, status: p.status, date_limite: p.date_limite,
      }));

      return {
        id: s.id,
        name: `${s.prenom ?? ''} ${s.nom ?? ''}`.trim() || 'Étudiant',
        firstName: s.prenom ?? '',
        lastName: s.nom ?? '',
        level: s.niveau ?? '',
        ref: `JD-${String(s.id).slice(0, 4).toUpperCase()}`,
        program: dossier?.desired_program || s.filiere || s.choix || 'Dossier étudiant',
        dest: dossier?.study_level || s.niveau || '—',
        dossierId: dossier?.id ?? null,
        status,
        pct: Math.round((done / milestones.length) * 100),
        step: nowIdx >= 0 ? nowIdx + 1 : milestones.length,
        stepLabel: milestones[nowIdx]?.label ?? 'Terminé',
        milestones,
        docs,
        docsDone,
        docsTotal: docsRequired.length,
        paid,
        due,
        peerUserId: s.user_id ?? s.created_by ?? null,
        phone: s.telephone ?? null,
        nationalite: s.nationalite ?? null,
        installments,
      };
    },
    enabled: !!studentId,
    staleTime: 60 * 1000,
  });
}

/**
 * Modifie un frais (montant + échéance) d'une tranche — parité web
 * StudentManagement.handleSaveFee. Réservé côté UI aux admin/super_admin.
 */
export function useUpdatePaymentFee(actor?: Actor) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ studentId, paymentId, montant, dateLimite }: {
      studentId: string; paymentId: string; montant: number; dateLimite: string | null;
    }) => {
      const { error } = await supabase
        .from('payments')
        .update({ montant, date_limite: dateLimite })
        .eq('id', paymentId);
      if (error) throw error;
      await logActivity(actor ?? {}, 'payment_update', 'payments', paymentId,
        `Frais modifié (montant ${montant})`, { student_id: studentId, payment_id: paymentId, montant });
    },
    onSuccess: (_d, v) => {
      qc.invalidateQueries({ queryKey: ['staff', 'student', v.studentId] });
      qc.invalidateQueries({ queryKey: ['staff', 'payments'] });
      qc.invalidateQueries({ queryKey: ['staff', 'dossiers'] });
    },
  });
}

/**
 * Supprime un frais (tranche) — parité web StudentManagement.handleDeleteFee.
 * Réservé côté UI aux admin/super_admin.
 */
export function useDeletePaymentFee(actor?: Actor) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ studentId, paymentId, meta }: {
      studentId: string; paymentId: string; meta?: Record<string, unknown>;
    }) => {
      const { error } = await supabase.from('payments').delete().eq('id', paymentId);
      if (error) throw error;
      await logActivity(actor ?? {}, 'payment_delete', 'payments', paymentId,
        'Frais supprimé', { student_id: studentId, payment_id: paymentId, ...(meta ?? {}) });
    },
    onSuccess: (_d, v) => {
      qc.invalidateQueries({ queryKey: ['staff', 'student', v.studentId] });
      qc.invalidateQueries({ queryKey: ['staff', 'payments'] });
      qc.invalidateQueries({ queryKey: ['staff', 'dossiers'] });
    },
  });
}

/**
 * Change le statut d'un dossier bourse — miroir de
 * `DossierWorkflow.handleStatusChange` (web) : valide la transition, met à jour
 * `dossier_bourses`, journalise dans `dossier_history` + `activity_logs`.
 */
export function useChangeDossierStatus(actor?: Actor) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      dossierId,
      studentId,
      fromStatus,
      toStatus,
      studentName,
    }: {
      dossierId: string;
      studentId: string;
      fromStatus: DossierStatus;
      toStatus: DossierStatus;
      studentName: string;
    }) => {
      const allowed = DOSSIER_TRANSITIONS[fromStatus] ?? [];
      if (!allowed.includes(toStatus)) throw new Error('Transition non autorisée');

      const { error: upErr } = await supabase
        .from('dossier_bourses')
        .update({ status: toStatus, updated_at: new Date().toISOString() })
        .eq('id', dossierId);
      if (upErr) throw upErr;

      // Historique (best-effort : la MAJ a déjà eu lieu, on n'échoue pas dessus).
      const { error: histErr } = await supabase.from('dossier_history').insert({
        dossier_id: dossierId,
        action: 'status_change',
        status: toStatus,
        description: `${fromStatus} → ${toStatus}`,
        performed_by: actor?.id ?? null,
      });
      if (histErr) console.warn('[dossier_history] insert error:', histErr.message);

      await logActivity(
        actor ?? {},
        'dossier_status_change',
        'dossier_bourses',
        dossierId,
        `Dossier ${studentName} : ${fromStatus} → ${toStatus}`,
        { dossier_id: dossierId, previous_status: fromStatus, new_status: toStatus },
      );
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ['staff', 'student', vars.studentId] });
      qc.invalidateQueries({ queryKey: ['staff', 'dossiers'] });
    },
  });
}

/**
 * Met à jour les infos d'un étudiant — miroir partiel de
 * `StudentManagement` (web). Champs éditables côté fiche staff : identité +
 * contact + niveau. Journalise dans `activity_logs`.
 */
export function useUpdateStudent(actor?: Actor) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      studentId,
      prenom,
      nom,
      telephone,
      niveau,
    }: {
      studentId: string;
      prenom: string;
      nom: string;
      telephone: string | null;
      niveau: string | null;
    }) => {
      const { error } = await supabase
        .from('students')
        .update({
          prenom: prenom.trim(),
          nom: nom.trim(),
          telephone: telephone?.trim() || null,
          niveau: niveau?.trim() || null,
        })
        .eq('id', studentId);
      if (error) throw error;

      await logActivity(
        actor ?? {},
        'student_update',
        'students',
        studentId,
        `Modification étudiant ${`${prenom} ${nom}`.trim()}`,
        { student_id: studentId },
      );
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ['staff', 'student', vars.studentId] });
      qc.invalidateQueries({ queryKey: ['staff', 'dossiers'] });
    },
  });
}

/**
 * Supprime un étudiant — miroir `StudentManagement.handleDelete` : supprime la
 * ligne `students` puis, si un compte auth est lié, le supprime via
 * `/api/delete-user` (best-effort). Journalise.
 */
export function useDeleteStudent(actor?: Actor) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ studentId, name, userId }: { studentId: string; name: string; userId?: string | null }) => {
      const { error } = await supabase.from('students').delete().eq('id', studentId);
      if (error) throw error;

      if (userId) {
        try {
          await apiFetch('/api/delete-user', { method: 'DELETE', body: JSON.stringify({ userId }) });
        } catch (e) {
          console.warn('[delete-user] best-effort échec', e);
        }
      }

      await logActivity(actor ?? {}, 'student_delete', 'students', studentId, `Étudiant supprimé — ${name}`, { student_id: studentId });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['staff', 'dossiers'] });
      qc.invalidateQueries({ queryKey: ['admin', 'candidatures'] });
      qc.invalidateQueries({ queryKey: ['admin', 'dashboard'] });
    },
  });
}

export type CreateStudentInput = {
  prenom: string;
  nom: string;
  email: string;
  telephone?: string;
  age: number;
  nationalite: string;
  niveau?: string;
  filiere?: string;
  langue?: string;
  choix: string;
};

/**
 * Crée un étudiant — miroir `StudentManagement.handleSubmit` (nouvel étudiant) :
 * 1) identifiant unique + mot de passe temporaire, 2) compte auth via
 * `/api/create-user` (role student), 3) ligne `students` liée, 4) dossier bourse
 * si une procédure est demandée. Retourne les identifiants à communiquer.
 * NB : la génération des tranches de paiement (sync) reste à faire ailleurs.
 */
export function useCreateStudent(actor?: Actor) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: CreateStudentInput) => {
      const prenom = input.prenom.trim();
      const nom = input.nom.trim();
      const { count } = await supabase
        .from('students')
        .select('id', { count: 'exact', head: true })
        .ilike('prenom', prenom)
        .ilike('nom', nom);

      const username = buildStudentUsername(prenom, nom, count ?? 0);
      const password = generateTemporaryPassword();
      const name = `${prenom} ${nom}`.trim();

      const res = await apiFetch('/api/create-user', {
        method: 'POST',
        body: JSON.stringify({
          name,
          email: input.email.trim(),
          username,
          password,
          role: 'student',
          authEmail: buildStudentAuthEmail(username),
          telephone: input.telephone?.trim() || null,
        }),
      });
      const result = (await res.json().catch(() => ({}))) as { userId?: string; error?: string };
      if (!res.ok || !result.userId) {
        throw new Error(result.error || `Échec de la création du compte (HTTP ${res.status}).`);
      }
      const userId = result.userId;

      const { data, error } = await supabase
        .from('students')
        .insert({
          prenom,
          nom,
          email: input.email.trim(),
          telephone: input.telephone?.trim() || null,
          age: input.age,
          nationalite: input.nationalite.trim() || null,
          niveau: input.niveau?.trim() || null,
          filiere: input.filiere?.trim() || null,
          langue: input.langue || null,
          choix: input.choix,
          created_by: userId,
          user_id: userId,
        })
        .select('id')
        .single();
      if (error) throw error;

      if (input.choix !== 'cours_seuls') {
        const { error: dossierErr } = await supabase.from('dossier_bourses').insert({
          student_id: data.id,
          status: 'document_manquant',
          desired_program: input.filiere?.trim() || '',
          study_level: input.niveau?.trim() || '',
          notes_internes: 'Dossier créé automatiquement à l’inscription (mobile)',
        });
        if (dossierErr) console.warn('[dossier_bourses] insert error:', dossierErr.message);
      }

      // Génère les tranches de paiement selon le service — miroir de
      // `syncPaymentsForStudent` (cas nouvel étudiant : aucun paiement existant).
      const tranches: { student_id: string; type: string; tranche: number; montant: number; status: string; penalites: number; date_limite: string }[] = [];
      const deadlineFrom = (days: number) => new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

      if (input.choix === 'procedure_seule' || input.choix === 'procedure_cours') {
        const cfg = DEFAULT_PAYMENT_CONFIGS[getBourseServiceType(input.niveau, input.nationalite)];
        const dl = deadlineFrom(cfg.deadline_offset_days);
        for (const tr of cfg.tranches) {
          tranches.push({ student_id: data.id, type: 'bourse', tranche: tr.tranche, montant: tr.montant, status: 'attente', penalites: 0, date_limite: dl });
        }
      }

      const langueKey = input.langue?.toLowerCase().includes('mandarin')
        ? 'mandarin'
        : input.langue?.toLowerCase().includes('anglais')
          ? 'anglais'
          : null;
      // Les cours de langue ne sont pas générés pour les étudiants internationaux.
      if (langueKey && !isInternational(input.nationalite) && (input.choix === 'cours_seuls' || input.choix === 'procedure_cours')) {
        const cfg = DEFAULT_PAYMENT_CONFIGS[langueKey];
        const dl = deadlineFrom(cfg.deadline_offset_days);
        for (const tr of cfg.tranches) {
          tranches.push({ student_id: data.id, type: langueKey, tranche: tr.tranche, montant: tr.montant, status: 'attente', penalites: 0, date_limite: dl });
        }
      }

      if (tranches.length) {
        const { error: payErr } = await supabase.from('payments').insert(tranches);
        if (payErr) console.warn('[payments] génération des tranches échouée:', payErr.message);
      }

      await logActivity(actor ?? {}, 'student_create', 'students', data.id, `Étudiant créé — ${name}`, {
        student_id: data.id,
        choix: input.choix,
      });

      return { username, password };
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['staff', 'dossiers'] });
      qc.invalidateQueries({ queryKey: ['admin', 'candidatures'] });
      qc.invalidateQueries({ queryKey: ['admin', 'dashboard'] });
      qc.invalidateQueries({ queryKey: ['admin', 'frais'] });
    },
  });
}

/* ── Paiements à valider (déclarations étudiantes) ───────────────────────── */
export type StaffPayment = {
  id: string;
  student_id: string;
  student: string;
  type: string;
  tranche?: number | null;
  amount: number;
  status: string;
  method?: string | null;
  proof?: string | null;
  declaredAt?: string | null;
};

const TYPE_LABEL: Record<string, string> = {
  bourse: 'Procédure bourse',
  mandarin: 'Cours mandarin',
  anglais: 'Cours anglais',
  inscription: 'Inscription',
  autre: 'Paiement',
};

export function useStaffPayments() {
  return useQuery({
    queryKey: ['staff', 'payments'],
    queryFn: async (): Promise<StaffPayment[]> => {
      const [pays, students] = await Promise.all([
        supabase
          .from('payments')
          .select('id, student_id, type, tranche, montant, montant_declare, status, facture_url, recu_url, updated_at, created_at, validated_by, initiated_by_student')
          .order('created_at', { ascending: false }),
        supabase.from('students').select('id, nom, prenom'),
      ]);
      if (pays.error) throw pays.error;
      const names = new Map<string, string>();
      for (const s of (students.data as { id: string; nom: string; prenom: string }[]) ?? []) {
        names.set(s.id, `${s.prenom ?? ''} ${s.nom ?? ''}`.trim());
      }
      return ((pays.data as any[]) ?? [])
        .filter((p) => p.status === 'en_validation' || p.validated_by)
        .map((p) => ({
          id: p.id,
          student_id: p.student_id,
          student: names.get(p.student_id) || 'Étudiant',
          type: TYPE_LABEL[p.type] ?? p.type,
          tranche: p.tranche,
          amount: Number(p.montant_declare) > 0 ? Number(p.montant_declare) : Number(p.montant),
          status: p.status,
          method: p.initiated_by_student ? 'Déclaré par l’étudiant' : null,
          proof: p.facture_url ?? p.recu_url,
          declaredAt: p.updated_at ?? p.created_at,
        }));
    },
    staleTime: 30 * 1000,
  });
}

/**
 * Valide / rejette un paiement déclaré — miroir de `PaymentsPage.tsx` (web) :
 * met à jour le paiement, crée l'entrée comptable si validé, notifie l'étudiant.
 */
export function useValidatePayment(userId?: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ paymentId, isValid, rejectionReason }: { paymentId: string; isValid: boolean; rejectionReason?: string }) => {
      const { data: payment, error: fErr } = await supabase
        .from('payments')
        .select('*, students(nom, prenom)')
        .eq('id', paymentId)
        .single();
      if (fErr || !payment) throw fErr ?? new Error('Paiement introuvable');

      const montantPaye = Number(payment.montant_paye ?? 0);
      const montantDeclare = Number(payment.montant_declare ?? 0);
      const validatedAmount = montantDeclare > 0 ? montantDeclare : Math.max(0, payment.montant - montantPaye);
      const newMontantPaye = montantPaye + validatedAmount;
      const fullySettled = newMontantPaye >= payment.montant;
      const nowIso = new Date().toISOString();

      const { error: uErr } = await supabase
        .from('payments')
        .update({
          status: isValid ? (fullySettled ? 'paye' : 'attente') : 'retard',
          montant_paye: isValid ? newMontantPaye : montantPaye,
          montant_declare: 0,
          validated_by: userId ?? null,
          validated_at: nowIso,
          date_paiement: isValid && fullySettled ? nowIso : isValid ? payment.date_paiement : null,
          rejection_reason: isValid ? null : rejectionReason ?? null,
          rejected_at: isValid ? null : nowIso,
        })
        .eq('id', paymentId);
      if (uErr) throw uErr;

      if (isValid) {
        const typeEntree = payment.type === 'mandarin' || payment.type === 'anglais' ? 'paiement_cours' : 'paiement_procedure';
        const studentName = payment.students ? `${payment.students.nom} ${payment.students.prenom}` : 'Étudiant';
        // Devise : services internationaux (service_type finissant par « _intl ») en USD.
        const deviseEntree = String(payment.type).endsWith('_intl') ? 'USD' : 'FCFA';
        await supabase.from('entrees_comptables').insert({
          montant: validatedAmount,
          date: nowIso,
          type: typeEntree,
          description: `Paiement ${payment.type} - Tranche ${payment.tranche || 'N/A'} - ${studentName}`,
          devise: deviseEntree,
          student_id: payment.student_id,
          payment_id: payment.id,
          created_by: userId ?? null,
        });
      }

      // Notifie l'étudiant (email + SMS + in-app) — fire-and-forget.
      apiFetch('/api/notify-payment-result', {
        method: 'POST',
        body: JSON.stringify({
          studentId: payment.student_id,
          isValid,
          paymentType: payment.type,
          tranche: payment.tranche,
          amount: validatedAmount,
          rejectionReason: rejectionReason ?? null,
        }),
      }).catch(() => {});
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['staff', 'payments'] });
      qc.invalidateQueries({ queryKey: ['staff', 'dossiers'] });
    },
  });
}

/* ── Rapports journaliers de l'équipe ────────────────────────────────────── */
export type StaffReport = {
  id: string;
  employee: string;
  poste: string;
  date: string;
  hours: number | null;
  activities: string;
  note?: string | null;
  status: string; // soumis | valide | signale (+ variantes)
};

export function useStaffReports() {
  return useQuery({
    queryKey: ['staff', 'reports'],
    queryFn: async (): Promise<StaffReport[]> => {
      const [reports, employees] = await Promise.all([
        supabase.from('daily_reports').select('*').order('date', { ascending: false }).limit(100),
        supabase.from('employees').select('id, nom, prenom, poste'),
      ]);
      if (reports.error) throw reports.error;
      const emp = new Map<string, { name: string; poste: string }>();
      for (const e of (employees.data as any[]) ?? []) {
        emp.set(e.id, { name: `${e.prenom ?? ''} ${e.nom ?? ''}`.trim(), poste: e.poste ?? '' });
      }
      return ((reports.data as any[]) ?? []).map((r) => {
        const e = emp.get(r.employee_id);
        return {
          id: r.id,
          employee: e?.name || r.employee_name || 'Employé',
          poste: e?.poste || r.poste || '',
          date: r.date,
          hours: r.heures_travaillees ?? r.hours ?? null,
          activities: r.activites ?? r.contenu ?? r.description ?? '',
          note: r.observations ?? r.note ?? null,
          status: r.status ?? r.statut ?? 'soumis',
        };
      });
    },
    staleTime: 60 * 1000,
  });
}

/**
 * Valide ou signale un rapport journalier.
 * La colonne `status` de `daily_reports` est ajoutée par
 * `migrations/add_daily_report_status.sql`. Tant qu'elle n'est pas appliquée,
 * l'écriture échoue silencieusement et on se contente d'une MAJ optimiste du
 * cache (le bouton réagit, sans casser l'UI).
 */
export function useReviewReport() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ok }: { id: string; ok: boolean }) => {
      const { error } = await supabase
        .from('daily_reports')
        .update({ status: ok ? 'valide' : 'signale' })
        .eq('id', id);
      // colonne absente / RLS : on n'interrompt pas, l'optimistic update suffit.
      return { id, ok, persisted: !error };
    },
    onMutate: async ({ id, ok }) => {
      await qc.cancelQueries({ queryKey: ['staff', 'reports'] });
      const prev = qc.getQueryData<StaffReport[]>(['staff', 'reports']);
      qc.setQueryData<StaffReport[]>(['staff', 'reports'], (old) =>
        (old ?? []).map((r) => (r.id === id ? { ...r, status: ok ? 'valide' : 'signale' } : r)),
      );
      return { prev };
    },
    onError: (_e, _v, ctx) => {
      if (ctx?.prev) qc.setQueryData(['staff', 'reports'], ctx.prev);
    },
  });
}

/** Un rapport « en attente » de validation (statuts soumis / en_attente). */
export function isPendingReport(status: string): boolean {
  return ['soumis', 'en_attente', 'pending', 'brouillon'].includes(status);
}

/* ── Badges (paiements à valider, messages non lus) ──────────────────────── */
export function useStaffBadges(userId?: string) {
  return useQuery({
    queryKey: ['staff', 'badges', userId],
    queryFn: async () => {
      const [pending, unread] = await Promise.all([
        supabase.from('payments').select('id', { count: 'exact', head: true }).eq('status', 'en_validation'),
        userId
          ? supabase.from('messages').select('id', { count: 'exact', head: true }).eq('to_user_id', userId).eq('read', false)
          : Promise.resolve({ count: 0 }),
      ]);
      return { payments: pending.count ?? 0, messages: (unread as { count: number }).count ?? 0 };
    },
    enabled: true,
    staleTime: 30 * 1000,
  });
}
