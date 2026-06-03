import type { EmployeeEvaluation } from "../types/hr";

// Critères d'évaluation (code → colonne DB) notés sur 5. Source unique partagée
// par le dossier employé (saisie) et la vue globale (agrégats).
export const EVAL_CRITERIA = [
  { code: "qualite", col: "note_qualite" },
  { code: "productivite", col: "note_productivite" },
  { code: "ponctualite", col: "note_ponctualite" },
  { code: "equipe", col: "note_equipe" },
  { code: "communication", col: "note_communication" },
  { code: "initiative", col: "note_initiative" },
  { code: "discipline", col: "note_discipline" },
] as const;

export type EvalCriterion = (typeof EVAL_CRITERIA)[number];
export type EvalCol = EvalCriterion["col"];

export const EVAL_SCORE_MAX = 5;

export function fmtNote(n: number): string {
  return Number(n).toLocaleString("fr-FR", {
    minimumFractionDigits: 1,
    maximumFractionDigits: 2,
  });
}

// Moyenne des notes globales d'un ensemble d'évaluations.
export function overallAverage(evals: EmployeeEvaluation[]): number {
  if (evals.length === 0) return 0;
  const sum = evals.reduce((s, e) => s + Number(e.note_globale), 0);
  return sum / evals.length;
}

// Moyenne par critère (clé = code du critère).
export function criterionAverages(evals: EmployeeEvaluation[]): Record<string, number> {
  const out: Record<string, number> = {};
  for (const c of EVAL_CRITERIA) {
    if (evals.length === 0) {
      out[c.code] = 0;
      continue;
    }
    const sum = evals.reduce((s, e) => s + Number(e[c.col]), 0);
    out[c.code] = sum / evals.length;
  }
  return out;
}
