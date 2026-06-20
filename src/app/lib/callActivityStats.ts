// Statistiques d'appels des rapports journaliers.
// Renseignées uniquement par les employés que l'admin a désignés manuellement
// via les cases « Saisie des compteurs d'appels » (suivi_appels) et
// « Soumis au quota hebdomadaire » (quota_appels) sur la fiche employé.

import type { DailyReport } from "../types/hr";

export type CallStatKey =
    | "nb_appels"
    | "nb_rdv_confirmes"
    | "nb_relances"
    | "nb_indisponibles"
    | "nb_rejets"
    | "nb_autres";

// Ordre d'affichage des compteurs dans le formulaire et les stats admin.
export const CALL_STAT_KEYS: CallStatKey[] = [
    "nb_appels",
    "nb_rdv_confirmes",
    "nb_relances",
    "nb_indisponibles",
    "nb_rejets",
    "nb_autres",
];

// Forme minimale d'un employé portant les indicateurs de suivi d'appels.
// Le `quota_appels` implique le suivi (un call center saisit toujours ses compteurs).
export interface CallFlagsHolder {
    suivi_appels?: boolean | null;
    quota_appels?: boolean | null;
}

// L'employé saisit-il les compteurs d'appels ? (sélection manuelle de l'admin)
export function employeeTracksCalls(emp?: CallFlagsHolder | null): boolean {
    return Boolean(emp?.suivi_appels || emp?.quota_appels);
}

// L'employé est-il soumis au quota hebdomadaire ? (sous-ensemble des call centers)
export function employeeHasCallQuota(emp?: CallFlagsHolder | null): boolean {
    return Boolean(emp?.quota_appels);
}

// Quota hebdomadaire minimum d'un call center.
export const WEEKLY_CALL_QUOTA = {
    nb_appels: 300,
    nb_rdv_confirmes: 90,
} as const;

// Lundi (YYYY-MM-DD, UTC) de la semaine contenant la date donnée.
export function weekStartIso(dateStr: string): string {
    const d = new Date(`${dateStr}T00:00:00Z`);
    const dow = (d.getUTCDay() + 6) % 7; // lundi = 0
    d.setUTCDate(d.getUTCDate() - dow);
    return d.toISOString().slice(0, 10);
}

// Décale une date ISO de `days` jours (UTC).
export function addDaysIso(dateStr: string, days: number): string {
    const d = new Date(`${dateStr}T00:00:00Z`);
    d.setUTCDate(d.getUTCDate() + days);
    return d.toISOString().slice(0, 10);
}

export interface WeeklyCallStat {
    weekStart: string; // lundi
    weekEnd: string; // dimanche
    totals: Record<CallStatKey, number>;
    reportsCount: number;
    quotaAppelsMet: boolean;
    quotaRdvMet: boolean;
}

// Regroupe les rapports par semaine (lundi→dimanche) et évalue le quota.
// Tri du plus récent au plus ancien.
export function groupReportsByWeek(
    reports: (Pick<DailyReport, CallStatKey> & { date: string })[]
): WeeklyCallStat[] {
    const map = new Map<string, WeeklyCallStat>();
    for (const r of reports) {
        const ws = weekStartIso(r.date);
        let w = map.get(ws);
        if (!w) {
            w = {
                weekStart: ws,
                weekEnd: addDaysIso(ws, 6),
                totals: { nb_appels: 0, nb_rdv_confirmes: 0, nb_relances: 0, nb_indisponibles: 0, nb_rejets: 0, nb_autres: 0 },
                reportsCount: 0,
                quotaAppelsMet: false,
                quotaRdvMet: false,
            };
            map.set(ws, w);
        }
        for (const k of CALL_STAT_KEYS) w.totals[k] += r[k] ?? 0;
        w.reportsCount += 1;
    }
    const arr = Array.from(map.values());
    for (const w of arr) {
        w.quotaAppelsMet = w.totals.nb_appels >= WEEKLY_CALL_QUOTA.nb_appels;
        w.quotaRdvMet = w.totals.nb_rdv_confirmes >= WEEKLY_CALL_QUOTA.nb_rdv_confirmes;
    }
    arr.sort((a, b) => (a.weekStart < b.weekStart ? 1 : -1));
    return arr;
}

// Score de productivité (1 à 5) dérivé de l'atteinte du quota hebdomadaire,
// destiné à alimenter la note de productivité d'une évaluation.
// `attainment` est le taux moyen d'atteinte (0..1) sur les semaines fournies.
export function quotaProductivityScore(
    weeks: WeeklyCallStat[]
): { score: number; attainment: number; weeksMet: number } | null {
    if (weeks.length === 0) return null;
    let sum = 0;
    let weeksMet = 0;
    for (const w of weeks) {
        const a = Math.min(w.totals.nb_appels / WEEKLY_CALL_QUOTA.nb_appels, 1);
        const r = Math.min(w.totals.nb_rdv_confirmes / WEEKLY_CALL_QUOTA.nb_rdv_confirmes, 1);
        sum += (a + r) / 2;
        if (w.quotaAppelsMet && w.quotaRdvMet) weeksMet += 1;
    }
    const attainment = sum / weeks.length;
    let score: number;
    if (attainment >= 0.98) score = 5;
    else if (attainment >= 0.85) score = 4;
    else if (attainment >= 0.7) score = 3;
    else if (attainment >= 0.5) score = 2;
    else score = 1;
    return { score, attainment, weeksMet };
}

// Agrège (somme) les compteurs d'un ensemble de rapports.
export function sumCallStats(
    reports: Pick<DailyReport, CallStatKey>[]
): Record<CallStatKey, number> {
    const acc = {
        nb_appels: 0,
        nb_rdv_confirmes: 0,
        nb_relances: 0,
        nb_indisponibles: 0,
        nb_rejets: 0,
        nb_autres: 0,
    } as Record<CallStatKey, number>;
    for (const r of reports) {
        for (const k of CALL_STAT_KEYS) acc[k] += r[k] ?? 0;
    }
    return acc;
}
