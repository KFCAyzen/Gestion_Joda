import { 
  Payment, 
  Student, 
  CoursLangue, 
  PaymentType, 
  MONTANTS_BOURSE, 
  MONTANTS_MANDARIN, 
  MONTANTS_ANGLAIS 
} from '../types/joda';
import { createPayment } from '../utils/firebaseOperations';

// Service de génération automatique des paiements
export class PaymentGenerationService {
  
  /**
   * Génère les 4 tranches de paiement pour une bourse
   */
  static async generateBoursePayments(studentId: string): Promise<string[]> {
    const paymentIds: string[] = [];
    const baseDate = new Date();

    const tranches = [
      {
        tranche: 1,
        montant: MONTANTS_BOURSE.TRANCHE_1, // 100,000 FCFA
        description: 'Inscription - Frais de candidature',
        delaiJours: 0 // Immédiat
      },
      {
        tranche: 2,
        montant: MONTANTS_BOURSE.TRANCHE_2, // 500,000 FCFA
        description: 'Dépôt des dossiers',
        delaiJours: 30 // 30 jours après inscription
      },
      {
        tranche: 3,
        montant: MONTANTS_BOURSE.TRANCHE_3, // 1,000,000 FCFA
        description: 'Après admission',
        delaiJours: 90 // 90 jours après inscription
      },
      {
        tranche: 4,
        montant: MONTANTS_BOURSE.TRANCHE_4, // 1,390,000 FCFA
        description: 'Après obtention visa',
        delaiJours: 180 // 180 jours après inscription
      }
    ];

    for (const tranche of tranches) {
      const dateLimite = new Date(baseDate);
      dateLimite.setDate(dateLimite.getDate() + tranche.delaiJours);

      const paymentData: Omit<Payment, 'id' | 'createdAt' | 'updatedAt'> = {
        studentId,
        type: 'bourse',
        tranche: tranche.tranche,
        montant: tranche.montant,
        status: tranche.tranche === 1 ? 'attente' : 'attente',
        date_limite: dateLimite,
        penalites: 0
      };

      const paymentId = await createPayment(paymentData);
      paymentIds.push(paymentId);
    }

    return paymentIds;
  }

  /**
   * Génère les paiements pour un cours de Mandarin
   */
  static async generateMandarinPayments(studentId: string): Promise<string[]> {
    const paymentIds: string[] = [];
    const baseDate = new Date();

    const tranches = [
      {
        tranche: 1,
        montant: MONTANTS_MANDARIN.INSCRIPTION,
        description: 'Inscription cours Mandarin',
        delaiJours: 0
      },
      {
        tranche: 2,
        montant: MONTANTS_MANDARIN.LIVRE,
        description: 'Livre de cours Mandarin',
        delaiJours: 7
      },
      {
        tranche: 3,
        montant: MONTANTS_MANDARIN.TRANCHE_1,
        description: 'Cours Mandarin - Tranche 1',
        delaiJours: 14
      },
      {
        tranche: 4,
        montant: MONTANTS_MANDARIN.TRANCHE_2,
        description: 'Cours Mandarin - Tranche 2',
        delaiJours: 60
      }
    ];

    for (const tranche of tranches) {
      const dateLimite = new Date(baseDate);
      dateLimite.setDate(dateLimite.getDate() + tranche.delaiJours);

      const paymentData: Omit<Payment, 'id' | 'createdAt' | 'updatedAt'> = {
        studentId,
        type: 'mandarin',
        tranche: tranche.tranche,
        montant: tranche.montant,
        status: tranche.tranche === 1 ? 'attente' : 'attente',
        date_limite: dateLimite,
        penalites: 0
      };

      const paymentId = await createPayment(paymentData);
      paymentIds.push(paymentId);
    }

    return paymentIds;
  }

  /**
   * Génère automatiquement les paiements selon le choix de l'étudiant
   */
  static async generatePaymentsForStudent(student: Student): Promise<{
    boursePayments?: string[];
    mandarinPayments?: string[];
  }> {
    const result: any = {};

    switch (student.choix) {
      case 'procedure_seule':
        result.boursePayments = await this.generateBoursePayments(student.id);
        break;

      case 'procedure_cours':
        result.boursePayments = await this.generateBoursePayments(student.id);
        result.mandarinPayments = await this.generateMandarinPayments(student.id);
        break;
    }

    return result;
  }
}