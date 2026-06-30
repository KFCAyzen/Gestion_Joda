import type { DossierStatus } from './hooks/use-student-portal';

export type MilestoneState = 'done' | 'now' | 'next' | 'lock' | 'blocked';
export type Milestone = { key: string; label: string; state: MilestoneState };

/** 6 jalons du voyage (handoff §2 Parcours). */
const LABELS = [
  'Inscription',
  'Documents',
  'Examen Joda',
  'Réponse université',
  'Visa étudiant',
  'Départ en Chine',
] as const;

// Index du statut web (0–7) → jalon mobile (0–5).
const STATUS_TO_8: Record<DossierStatus, number> = {
  document_manquant: 0,
  en_attente: 1,
  document_recu: 2,
  en_cours: 3,
  en_attente_universite: 4,
  admission_validee: 5,
  admission_rejetee: 5,
  visa_en_cours: 6,
  termine: 7,
};
const EIGHT_TO_MILESTONE = [1, 1, 2, 2, 3, 4, 4, 5];

/**
 * Transitions de statut autorisées — miroir de `DOSSIER_STATUSES` (web
 * DossierWorkflow). Une transition n'est permise que si la cible figure ici.
 */
export const DOSSIER_TRANSITIONS: Record<DossierStatus, DossierStatus[]> = {
  document_recu: ['en_attente', 'document_manquant'],
  en_attente: ['en_cours', 'document_manquant'],
  en_cours: ['admission_validee', 'admission_rejetee', 'document_manquant'],
  document_manquant: ['document_recu', 'en_attente'],
  admission_validee: ['en_attente_universite', 'visa_en_cours'],
  admission_rejetee: ['en_attente', 'en_cours'],
  en_attente_universite: ['visa_en_cours', 'admission_rejetee'],
  visa_en_cours: ['termine'],
  termine: [],
};

/** Libellés complets des statuts dossier (pour les boutons d'avancement). */
export const DOSSIER_STATUS_LABEL: Record<DossierStatus, string> = {
  document_recu: 'Document reçu',
  en_attente: 'En attente',
  en_cours: 'En cours',
  document_manquant: 'Document manquant',
  admission_validee: 'Admission validée',
  admission_rejetee: 'Admission rejetée',
  en_attente_universite: 'En attente université',
  visa_en_cours: 'Visa en cours',
  termine: 'Terminé',
};

/** Construit les 6 jalons avec leur état, à partir du statut dossier. */
export function buildMilestones(status: DossierStatus | null | undefined): Milestone[] {
  const rejected = status === 'admission_rejetee';
  const current = status == null ? 1 : rejected ? 3 : EIGHT_TO_MILESTONE[STATUS_TO_8[status]];

  return LABELS.map((label, i) => {
    let state: MilestoneState;
    if (rejected && i === 3) state = 'blocked';
    else if (i < current) state = 'done';
    else if (i === current) state = 'now';
    else if (i === current + 1) state = 'next';
    else state = 'lock';
    return { key: label, label, state };
  });
}
