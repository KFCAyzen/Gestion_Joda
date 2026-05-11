/**
 * Calcule la pénalité de retard d'un paiement selon la config Joda :
 *   - bourse : 3 j grâce, 10 000 FCFA/j (par défaut)
 *   - mandarin / anglais : 15 j grâce, 1 000 FCFA/j (par défaut)
 *   - inscription (frais univ.) : 14 j grâce, 500 FCFA/j
 *
 * Si un objet config est passé, ses valeurs ont la priorité sur les défauts.
 */
export interface PenaltyPayment {
    status: string;
    type: string;
    date_limite: string | null;
}

export interface PenaltyConfig {
    grace_days: number;
    daily_penalty: number;
}

export function calculatePenalty(payment: PenaltyPayment, config?: PenaltyConfig): number {
    if (payment.status === "paye" || !payment.date_limite) return 0;

    let graceDays: number;
    let dailyRate: number;

    if (config) {
        graceDays = config.grace_days;
        dailyRate = config.daily_penalty;
    } else if (payment.type === "mandarin" || payment.type === "anglais") {
        graceDays = 15;
        dailyRate = 1000;
    } else if (payment.type === "inscription") {
        graceDays = 14;
        dailyRate = 500;
    } else {
        // bourse et autres
        graceDays = 3;
        dailyRate = 10000;
    }

    const today = new Date();
    const deadline = new Date(payment.date_limite);

    const graceDate = new Date(deadline);
    graceDate.setDate(graceDate.getDate() + graceDays);
    if (today <= graceDate) return 0;

    const daysLate = Math.floor(
        (today.getTime() - graceDate.getTime()) / (1000 * 60 * 60 * 24)
    );
    return daysLate * dailyRate;
}
