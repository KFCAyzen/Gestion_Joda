// Moteur de paie — barèmes statutaires du Cameroun (CNPS + impôts sur salaire).
//
// SOURCE UNIQUE de calcul : utilisé par le formulaire de création de fiche, le
// PDF du bulletin et (en miroir) par la RPC SQL d'auto-génération. Toute évolution
// de taux se fait ICI puis se répercute dans `update_hr_generate_due_payslips_legal.sql`.
//
// ⚠️ Les taux/barèmes ci-dessous reflètent la réglementation usuelle (CGI + CNPS).
// Ils doivent être vérifiés chaque année avec un comptable / le barème officiel.
//
// Hypothèses de simplification (assumées, documentées) :
//  • Base cotisable/taxable = salaire brut (salaire de base + primes), sans
//    distinction des éléments non imposables (ex. indemnité de transport exonérée).
//  • La retenue pour absences est traitée comme une retenue sur le net, sans
//    réduire la base de calcul des cotisations.

export const PAYROLL_RATES = {
  // Part salariale
  pvidEmployee: 0.042, // CNPS — Pension Vieillesse/Invalidité/Décès
  pvidCap: 750_000, // plafond mensuel de la base PVID
  cfcEmployee: 0.01, // Crédit Foncier du Cameroun
  fraisProfessionnels: 0.30, // abattement forfaitaire IRPP
  irppAbattementAnnuel: 500_000, // abattement annuel IRPP
  cac: 0.10, // Centimes Additionnels Communaux (sur l'IRPP)
  // Part patronale (informative — non déduite du salarié)
  pvidEmployer: 0.042,
  prestationsFamiliales: 0.07,
  pfCap: 750_000, // plafond prestations familiales
  risquesPro: 0.0175, // taux de base (classe A) — variable selon le risque
  cfcEmployer: 0.015,
  fne: 0.01, // Fonds National de l'Emploi
} as const;

// Barème IRPP annuel progressif (sur le revenu net catégoriel).
const IRPP_SLABS: Array<{ width: number; rate: number }> = [
  { width: 2_000_000, rate: 0.10 }, // 0 – 2 000 000
  { width: 1_000_000, rate: 0.15 }, // 2 000 001 – 3 000 000
  { width: 2_000_000, rate: 0.25 }, // 3 000 001 – 5 000 000
  { width: Infinity, rate: 0.35 }, // > 5 000 000
];

// Redevance Audiovisuelle (RAV) — barème mensuel selon le salaire taxable.
const RAV_BRACKETS: Array<{ max: number; amount: number }> = [
  { max: 50_000, amount: 0 },
  { max: 100_000, amount: 750 },
  { max: 200_000, amount: 1_950 },
  { max: 300_000, amount: 3_250 },
  { max: 400_000, amount: 4_550 },
  { max: 500_000, amount: 5_850 },
  { max: 600_000, amount: 7_150 },
  { max: 700_000, amount: 8_450 },
  { max: 800_000, amount: 9_750 },
  { max: 900_000, amount: 11_050 },
  { max: 1_000_000, amount: 12_350 },
  { max: Infinity, amount: 13_000 },
];

// Taxe de Développement Local (TDL) — barème mensuel selon le salaire de base.
const TDL_BRACKETS: Array<{ max: number; amount: number }> = [
  { max: 62_000, amount: 0 },
  { max: 75_000, amount: 250 },
  { max: 100_000, amount: 500 },
  { max: 125_000, amount: 750 },
  { max: 150_000, amount: 1_000 },
  { max: 200_000, amount: 1_250 },
  { max: 250_000, amount: 1_500 },
  { max: 300_000, amount: 2_000 },
  { max: Infinity, amount: 2_500 },
];

function bracketAmount(value: number, table: Array<{ max: number; amount: number }>): number {
  for (const b of table) {
    if (value <= b.max) return b.amount;
  }
  return table[table.length - 1].amount;
}

function computeIRPPAnnual(netCategorielAnnuel: number): number {
  let remaining = netCategorielAnnuel;
  if (remaining <= 0) return 0;
  let tax = 0;
  for (const slab of IRPP_SLABS) {
    const amt = Math.min(remaining, slab.width);
    tax += amt * slab.rate;
    remaining -= amt;
    if (remaining <= 0) break;
  }
  return tax;
}

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

  // Cotisations salariales
  const pvidBase = Math.min(brut, PAYROLL_RATES.pvidCap);
  const pvid = r(pvidBase * PAYROLL_RATES.pvidEmployee);
  const cfc = r(brut * PAYROLL_RATES.cfcEmployee);

  // IRPP (annualisé puis ramené au mois)
  const brutAnnuel = brut * 12;
  const pvidAnnuel = pvid * 12;
  const netCategoriel =
    brutAnnuel * (1 - PAYROLL_RATES.fraisProfessionnels) -
    pvidAnnuel -
    PAYROLL_RATES.irppAbattementAnnuel;
  const irppAnnuel = computeIRPPAnnual(netCategoriel);
  const irpp = r(irppAnnuel / 12);
  const cac = r(irpp * PAYROLL_RATES.cac);

  const rav = bracketAmount(brut, RAV_BRACKETS);
  const tdl = bracketAmount(base, TDL_BRACKETS);

  const totalCotisations = pvid + cfc + irpp + cac + rav + tdl;
  const totalRetenues = totalCotisations + autresRetenues + absenceDeduction;
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
