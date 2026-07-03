import { create } from 'zustand';
import type { StudentView } from '../../components/student/types';
import type { Payment } from '../schemas/payment.schema';

// ── Types ─────────────────────────────────────────────────────────────────────

export interface DeclareModal {
  paymentId: string | null;
  type: string;
  trancheNum: number;
  montantTranche: number;
  label: string;
  dateLimite: string | null;
}

interface StudentPortalState {
  // Navigation (persisté en sessionStorage)
  view: StudentView;
  setView: (view: StudentView) => void;
  initView: () => void;

  // Modal déclaration de paiement
  declareModal: DeclareModal | null;
  paymentMode: 'complet' | 'avance';
  montantAvance: string;
  proofFile: File | null;
  openDeclareModal: (modal: DeclareModal) => void;
  closeDeclareModal: () => void;
  setPaymentMode: (mode: 'complet' | 'avance') => void;
  setMontantAvance: (amount: string) => void;
  setProofFile: (file: File | null) => void;

  // Modal détail paiement
  detailPayment: Payment | null;
  setDetailPayment: (payment: Payment | null) => void;

  // Compteur messages non lus (messagerie)
  unreadMessages: number;
  setUnreadMessages: (count: number) => void;
}

// ── Store ─────────────────────────────────────────────────────────────────────

export const useStudentPortalStore = create<StudentPortalState>((set) => ({
  // Navigation — initialisée à 'dashboard', synchronisée depuis sessionStorage au mount
  view: 'dashboard',

  setView: (view) => {
    if (typeof window !== 'undefined') sessionStorage.setItem('student_view', view);
    set({ view });
  },

  initView: () => {
    if (typeof window === 'undefined') return;
    const saved = sessionStorage.getItem('student_view') as StudentView | null;
    if (saved) set({ view: saved });
  },

  // Modal déclaration
  declareModal: null,
  paymentMode: 'complet',
  montantAvance: '',
  proofFile: null,

  openDeclareModal: (modal) =>
    set({
      declareModal: modal,
      paymentMode: 'complet',
      montantAvance: modal.montantTranche.toString(),
      proofFile: null,
    }),

  closeDeclareModal: () =>
    set({ declareModal: null, proofFile: null }),

  setPaymentMode: (paymentMode) => set({ paymentMode }),
  setMontantAvance: (montantAvance) => set({ montantAvance }),
  setProofFile: (proofFile) => set({ proofFile }),

  // Modal détail
  detailPayment: null,
  setDetailPayment: (detailPayment) => set({ detailPayment }),

  // Messagerie
  unreadMessages: 0,
  // Bail si la valeur est inchangée : renvoyer le même état évite à zustand de
  // notifier ses abonnés (dont StudentPortal, abonné au store entier). Sans ce
  // garde, un setUnreadMessages(0) répété recrée un état → re-render → l'effet
  // enfant rappelle setUnreadMessages(0) → boucle infinie (React #185).
  setUnreadMessages: (unreadMessages) =>
    set((s) => (s.unreadMessages === unreadMessages ? s : { unreadMessages })),
}));
