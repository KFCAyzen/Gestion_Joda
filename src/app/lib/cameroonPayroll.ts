// Moteur de paie — Cameroun.
//
// SOURCE UNIQUE de calcul : utilisé par le formulaire de création de fiche, le
// PDF du bulletin et (en miroir) par la RPC SQL d'auto-génération. Toute évolution
// se fait ICI puis se répercute dans `update_hr_generate_due_payslips_legal.sql`.
//
// ⚠️ Retenues légales DÉSACTIVÉES à la demande de l'entreprise : aucune
// cotisation ni impôt sur salaire (CNPS/PVID, CFC, IRPP, CAC, RAV, TDL) n'est
// prélevé. Le net à payer = salaire brut − (retenues manuelles + absences).
// Les champs pvid/cfc/irpp/cac/rav/tdl sont conservés (toujours à 0) pour
// préserver le contrat de `PayrollResult`. Pour réactiver le calcul légal,
// restaurer les barèmes depuis l'historique git.
//
// Hypothèses de simplification (assumées, documentées) :
//  • La retenue pour absences est traitée comme une retenue sur le net.

export const PAYROLL_RATES = {
  pvidCap: 750_000, // plafond mensuel de la base PVID (charges patronales)
  // Part patronale (informative — non déduite du salarié)
  pvidEmployer: 0.042,
  prestationsFamiliales: 0.07,
  pfCap: 750_000, // plafond prestations familiales
  risquesPro: 0.0175, // taux de base (classe A) — variable selon le risque
  cfcEmployer: 0.015,
  fne: 0.01, // Fonds National de l'Emploi
} as const;

export interface PayrollInput {
  salaireBase: number;
  primes?: number;
  joursAbsences?: number;
  /** Retenues diverses (disciplinaires/manuelles), hors cotisations statutaires. */
  autresRetenues?: number;
}

export interface PayrollResult {
  brut: number;
  absenceDeduction: number;
  // Cotisations & impôts (part salariale)
  pvid: number;
  cfc: number;
  irpp: number;
  cac: number;
  rav: number;
  tdl: number;
  autresRetenues: number;
  totalCotisations: number; // pvid+cfc+irpp+cac+rav+tdl
  totalRetenues: number; // totalCotisations + autresRetenues + absenceDeduction
  netAPayer: number;
  // Charges patronales (informatif)
  employer: {
    pvid: number;
    prestationsFamiliales: number;
    risquesPro: number;
    cfc: number;
    fne: number;
    total: number;
  };
  coutTotalEmployeur: number; // brut + charges patronales
}

const r = Math.round;

export function computeCameroonPayroll(input: PayrollInput): PayrollResult {
  const base = Math.max(0, input.salaireBase || 0);
  const primes = Math.max(0, input.primes || 0);
  const joursAbsences = Math.max(0, input.joursAbsences || 0);
  const autresRetenues = Math.max(0, input.autresRetenues || 0);

  const brut = base + primes;
  const absenceDeduction = r(base / 30) * joursAbsences;

  // Retenues légales désactivées : aucune cotisation ni impôt sur salaire.
  const pvid = 0;
  const cfc = 0;
  const irpp = 0;
  const cac = 0;
  const rav = 0;
  const tdl = 0;

  const pvidBase = Math.min(brut, PAYROLL_RATES.pvidCap); // base des charges patronales
  const totalCotisations = 0;
  const totalRetenues = autresRetenues + absenceDeduction;
  const netAPayer = Math.max(0, brut - totalRetenues);

  // Charges patronales (informatif)
  const empPvid = r(pvidBase * PAYROLL_RATES.pvidEmployer);
  const empPf = r(Math.min(brut, PAYROLL_RATES.pfCap) * PAYROLL_RATES.prestationsFamiliales);
  const empRp = r(brut * PAYROLL_RATES.risquesPro);
  const empCfc = r(brut * PAYROLL_RATES.cfcEmployer);
  const empFne = r(brut * PAYROLL_RATES.fne);
  const empTotal = empPvid + empPf + empRp + empCfc + empFne;

  return {
    brut,
    absenceDeduction,
    pvid,
    cfc,
    irpp,
    cac,
    rav,
    tdl,
    autresRetenues,
    totalCotisations,
    totalRetenues,
    netAPayer,
    employer: {
      pvid: empPvid,
      prestationsFamiliales: empPf,
      risquesPro: empRp,
      cfc: empCfc,
      fne: empFne,
      total: empTotal,
    },
    coutTotalEmployeur: brut + empTotal,
  };
}
