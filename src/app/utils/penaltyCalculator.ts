/**
 * Calcule la pénalité de retard d'un paiement selon le CDC Joda :
 *   - bourse / inscription (frais bourse) : 3 j grace, 10 000 FCFA/j
 *   - inscription (frais d'inscription univ.) : 14 j grace, 500 FCFA/j
 *   - mandarin / anglais : 30 j grace, 1 000 FCFA/j
 */
export interface PenaltyPayment {
    status: string;
    type: string;
    date_limite: string | null;
}

export function calculatePenalty(payment: PenaltyPayment): number {
    if (payment.status === "paye" || !payment.date_limite) return 0;

    const today = new Date();
    const deadline = new Date(payment.date_limite);

    let graceDays: number;
    let dailyRate: number;

    if (payment.type === "mandarin" || payment.type === "anglais") {
        graceDays = 30;
        dailyRate = 1000;
    } else if (payment.type === "inscription") {
        graceDays = 14;
        dailyRate = 500;
    } else {
        // bourse and all others
        graceDays = 3;
        dailyRate = 10000;
    }

    const graceDate = new Date(deadline);
    graceDate.setDate(graceDate.getDate() + graceDays);
    if (today <= graceDate) return 0;

    const daysLate = Math.floor(
        (today.getTime() - graceDate.getTime()) / (1000 * 60 * 60 * 24)
    );
    return daysLate * dailyRate;
}
