export interface PaymentConfigTranche {
    tranche: number;
    label: string;
    montant: number;
}

export interface PaymentConfig {
    id?: string;
    service_type: 'bourse_bachelor' | 'bourse_master' | 'mandarin' | 'anglais';
    label: string;
    tranches: PaymentConfigTranche[];
    grace_days: number;
    daily_penalty: number;
    deadline_offset_days: number;
    updated_at?: string;
    updated_by?: string | null;
}

export type ServiceType = PaymentConfig['service_type'];

// Configs par défaut — utilisées en fallback si la DB est vide
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
};

export function getBourseServiceType(niveau?: string): ServiceType {
    return niveau?.toLowerCase().includes('master') ? 'bourse_master' : 'bourse_bachelor';
}

export function getTotalMontant(config: PaymentConfig): number {
    return config.tranches.reduce((sum, t) => sum + t.montant, 0);
}
