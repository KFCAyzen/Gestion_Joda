// Référence lisible et stable d'une fiche de paie, dérivée de son UUID + période.
// Format : FP-AAAA-MM-XXXXXX (ex. FP-2026-06-3F9A2B). Pas de migration : l'identité
// repose sur l'id déjà stocké en base, on n'en expose qu'une forme courte et lisible.

export function payslipReference(p: { id: string; mois: number; annee: number }): string {
  const mm = String(p.mois).padStart(2, "0");
  const short = String(p.id ?? "")
    .replace(/-/g, "")
    .slice(0, 6)
    .toUpperCase()
    .padEnd(6, "0");
  return `FP-${p.annee}-${mm}-${short}`;
}
