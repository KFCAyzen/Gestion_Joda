import type { DailyReport, Employee, EmployeeEvaluation } from "../types/hr";
import { EVAL_SCORE_MAX, criterionAverages, overallAverage } from "./hrEvaluation";

// Indice de performance des employés (0–100), dérivé de DEUX sources :
//   • Notations (hr_employee_evaluations) → note_globale moyenne /5 ramenée /100.
//   • Rapports journaliers (daily_reports) → score de régularité (nb de rapports
//     + heures travaillées), normalisé relativement au meilleur employé du lot.
//
// Pondération quand les deux sources existent : 70 % notations / 30 % rapports.
// Si une seule source est disponible (ex. employé sans compte jamais noté, ou
// jamais de rapport), l'indice utilise la source présente (indice partiel) au
// lieu d'exclure l'employé. Un employé sans aucune des deux n'apparaît pas.
//
// La fonction est agnostique à la période : l'appelant filtre évaluations et
// rapports en amont, puis passe les lignes déjà bornées.

export const PERF_NOTATION_WEIGHT = 0.7;
export const PERF_REPORT_WEIGHT = 0.3;

// Sous-pondération interne du score « rapports » (régularité).
const REPORT_COUNT_WEIGHT = 0.5;
const REPORT_HOURS_WEIGHT = 0.5;

export interface EmployeePerfRow {
  employee: Employee | null;
  empId: string;
  evalCount: number;
  evalAvg: number; // note globale moyenne /5
  notationScore: number | null; // 0–100, ou null si aucune évaluation
  crit: Record<string, number>;
  reportCount: number;
  totalHours: number;
  reportScore: number; // 0–100 (régularité, normalisée vs meilleur employé)
  hasReports: boolean;
  performanceIndex: number; // 0–100 composite
  rank: number;
}

function normalize(value: number, max: number): number {
  return max > 0 ? Math.min(value / max, 1) : 0;
}

export function computeEmployeePerformance(
  employees: Employee[],
  evaluations: EmployeeEvaluation[],
  reports: DailyReport[],
): EmployeePerfRow[] {
  const empById = new Map<string, Employee>();
  for (const e of employees) empById.set(e.id, e);

  const evalByEmp = new Map<string, EmployeeEvaluation[]>();
  for (const ev of evaluations) {
    const arr = evalByEmp.get(ev.employee_id) ?? [];
    arr.push(ev);
    evalByEmp.set(ev.employee_id, arr);
  }

  const reportsByEmp = new Map<string, DailyReport[]>();
  for (const r of reports) {
    const arr = reportsByEmp.get(r.employee_id) ?? [];
    arr.push(r);
    reportsByEmp.set(r.employee_id, arr);
  }

  // Tous les employés ayant au moins une notation OU un rapport sur la période.
  const empIds = new Set<string>([...evalByEmp.keys(), ...reportsByEmp.keys()]);

  // Pré-agrégats par employé (pour pouvoir normaliser les rapports ensuite).
  const base = Array.from(empIds).map((empId) => {
    const evals = evalByEmp.get(empId) ?? [];
    const empReports = reportsByEmp.get(empId) ?? [];
    const totalHours = empReports.reduce((s, r) => s + (r.heures_travaillees || 0), 0);
    const evalAvg = evals.length > 0 ? overallAverage(evals) : 0;
    return {
      empId,
      employee: empById.get(empId) ?? null,
      evals,
      evalCount: evals.length,
      evalAvg,
      crit: criterionAverages(evals),
      reportCount: empReports.length,
      totalHours,
    };
  });

  const maxCount = Math.max(0, ...base.map((b) => b.reportCount));
  const maxHours = Math.max(0, ...base.map((b) => b.totalHours));

  const rows: EmployeePerfRow[] = base.map((b) => {
    const hasNotation = b.evalCount > 0;
    const hasReports = b.reportCount > 0;

    const notationScore = hasNotation
      ? (b.evalAvg / EVAL_SCORE_MAX) * 100
      : null;

    const reportScore =
      (REPORT_COUNT_WEIGHT * normalize(b.reportCount, maxCount) +
        REPORT_HOURS_WEIGHT * normalize(b.totalHours, maxHours)) *
      100;

    let performanceIndex: number;
    if (hasNotation && hasReports) {
      performanceIndex =
        PERF_NOTATION_WEIGHT * (notationScore as number) +
        PERF_REPORT_WEIGHT * reportScore;
    } else if (hasNotation) {
      performanceIndex = notationScore as number;
    } else {
      performanceIndex = reportScore;
    }

    return {
      employee: b.employee,
      empId: b.empId,
      evalCount: b.evalCount,
      evalAvg: b.evalAvg,
      notationScore: notationScore === null ? null : Math.round(notationScore),
      crit: b.crit,
      reportCount: b.reportCount,
      totalHours: b.totalHours,
      reportScore: Math.round(reportScore),
      hasReports,
      performanceIndex: Math.round(performanceIndex),
      rank: 0,
    };
  });

  rows.sort((a, b) => b.performanceIndex - a.performanceIndex);
  return rows.map((r, i) => ({ ...r, rank: i + 1 }));
}

// Moyenne des indices de performance d'un classement (0 si vide).
export function averagePerformanceIndex(rows: EmployeePerfRow[]): number {
  if (rows.length === 0) return 0;
  return Math.round(rows.reduce((s, r) => s + r.performanceIndex, 0) / rows.length);
}

// Couleurs (texte + barre) pour un indice 0–100, alignées sur la grille
// utilisée par la page Performances des agents.
export function perfIndexColor(index: number): { text: string; bar: string } {
  if (index >= 70) return { text: "text-emerald-600 dark:text-emerald-400", bar: "bg-emerald-500" };
  if (index >= 40) return { text: "text-amber-600 dark:text-amber-400", bar: "bg-amber-500" };
  return { text: "text-rose-600 dark:text-rose-400", bar: "bg-rose-500" };
}

