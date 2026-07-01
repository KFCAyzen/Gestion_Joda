/**
 * Grille tarifaire par défaut — port de `src/app/types/payment-config.ts` (web).
 * Sert à générer les tranches de paiement d'un étudiant à sa création (miroir de
 * `StudentManagement.syncPaymentsForStudent`). Reste en miroir du web.
 */
export interface PaymentConfigTranche {
  tranche: number;
  label: string;
  montant: number;
}

export interface PaymentConfig {
  service_type: ServiceType;
  label: string;
  tranches: PaymentConfigTranche[];
  grace_days: number;
  daily_penalty: number;
  deadline_offset_days: number;
}

export type ServiceType =
  | 'bourse_bachelor'
  | 'bourse_master'
  | 'bourse_bachelor_intl'
  | 'bourse_master_intl'
  | 'mandarin'
  | 'anglais'
  | 'language_program_intl'
  | 'partial_scholarship_intl'
  | 'full_scholarship_intl';

export const DEFAULT_PAYMENT_CONFIGS: Record<ServiceType, PaymentConfig> = {
  bourse_bachelor: {
    service_type: 'bourse_bachelor',
    label: 'Procédure Bourse — Bachelor',
    tranches: [
      { tranche: 1, label: 'Ouverture de dossier', montant: 150000 },
      { tranche: 2, label: 'Caution', montant: 500000 },
      { tranche: 3, label: 'Visa', montant: 1000000 },
    ],
    grace_days: 3,
    daily_penalty: 10000,
    deadline_offset_days: 30,
  },
  bourse_master: {
    service_type: 'bourse_master',
    label: 'Procédure Bourse — Master',
    tranches: [
      { tranche: 1, label: 'Ouverture de dossier', montant: 150000 },
      { tranche: 2, label: 'Caution', montant: 500000 },
      { tranche: 3, label: 'Visa', montant: 1300000 },
    ],
    grace_days: 3,
    daily_penalty: 10000,
    deadline_offset_days: 30,
  },
  bourse_bachelor_intl: {
    service_type: 'bourse_bachelor_intl',
    label: 'Opening Fee — Bachelor',
    tranches: [{ tranche: 1, label: 'Opening Fee', montant: 150 }],
    grace_days: 3,
    daily_penalty: 5,
    deadline_offset_days: 30,
  },
  bourse_master_intl: {
    service_type: 'bourse_master_intl',
    label: 'Opening Fee — Master',
    tranches: [{ tranche: 1, label: 'Opening Fee', montant: 150 }],
    grace_days: 3,
    daily_penalty: 5,
    deadline_offset_days: 30,
  },
  mandarin: {
    service_type: 'mandarin',
    label: 'Cours de Mandarin',
    tranches: [
      { tranche: 1, label: 'Inscription', montant: 30000 },
      { tranche: 2, label: 'Livre', montant: 20000 },
      { tranche: 3, label: '1re tranche', montant: 70000 },
      { tranche: 4, label: '2e tranche', montant: 30000 },
    ],
    grace_days: 15,
    daily_penalty: 1000,
    deadline_offset_days: 15,
  },
  anglais: {
    service_type: 'anglais',
    label: "Cours d'Anglais",
    tranches: [
      { tranche: 1, label: 'Inscription', montant: 10000 },
      { tranche: 2, label: 'Livre', montant: 11000 },
      { tranche: 3, label: '1re tranche', montant: 30000 },
      { tranche: 4, label: '2e tranche', montant: 40000 },
    ],
    grace_days: 15,
    daily_penalty: 1000,
    deadline_offset_days: 15,
  },
  language_program_intl: {
    service_type: 'language_program_intl',
    label: 'Language Program',
    tranches: [{ tranche: 1, label: 'Language Program Fee', montant: 749 }],
    grace_days: 7,
    daily_penalty: 10,
    deadline_offset_days: 30,
  },
  partial_scholarship_intl: {
    service_type: 'partial_scholarship_intl',
    label: 'Partial Scholarship',
    tranches: [{ tranche: 1, label: 'Partial Scholarship Fee', montant: 1100 }],
    grace_days: 7,
    daily_penalty: 10,
    deadline_offset_days: 30,
  },
  full_scholarship_intl: {
    service_type: 'full_scholarship_intl',
    label: 'Full Scholarship',
    tranches: [{ tranche: 1, label: 'Full Scholarship Fee', montant: 1499 }],
    grace_days: 7,
    daily_penalty: 10,
    deadline_offset_days: 30,
  },
};

export function isInternational(nationalite?: string | null): boolean {
  if (!nationalite) return false;
  const n = nationalite.trim().toLowerCase();
  return n !== 'camerounais' && n !== 'camerounaise';
}

export function getBourseServiceType(niveau?: string, nationalite?: string | null): ServiceType {
  const isMaster = niveau?.toLowerCase().includes('master');
  if (isInternational(nationalite)) {
    return isMaster ? 'bourse_master_intl' : 'bourse_bachelor_intl';
  }
  return isMaster ? 'bourse_master' : 'bourse_bachelor';
}
