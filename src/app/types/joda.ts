// Types pour le système de gestion Joda Company

export type UserRole = 'student' | 'agent' | 'admin' | 'supervisor';

export type DocumentType = 'passeport' | 'casier_judiciaire' | 'carte_photo' | 'releve_bac' | 'diplome_bac';

export type DocumentStatus = 'en_attente' | 'valide' | 'non_conforme';

export type DossierStatus = 
  | 'document_recu'
  | 'en_attente' 
  | 'en_cours'
  | 'document_manquant'
  | 'admission_validee'
  | 'admission_rejetee'
  | 'en_attente_universite'
  | 'visa_en_cours'
  | 'termine';

export type PaymentStatus = 'paye' | 'attente' | 'retard';

export type PaymentType = 'bourse' | 'mandarin' | 'anglais';

export type LanguageCourse = 'mandarin' | 'anglais';

export type StudentChoice = 'procedure_seule' | 'cours_seuls' | 'procedure_cours';

// Interface Utilisateur
export interface User {
  id: string;
  username: string;
  email: string;
  role: UserRole;
  name: string;
  createdAt: Date;
  updatedAt: Date;
  mustChangePassword?: boolean;
}

// Interface Étudiant
export interface Student {
  id: string;
  // Informations personnelles
  nom: string;
  prenom: string;
  email: string;
  telephone: string;
  age: number;
  sexe: 'M' | 'F';
  niveau: string;
  filiere: string;
  langue: string;
  diplome_acquis: string;
  photo?: string; // URL de la photo
  
  // Informations passeport
  passeport: {
    numero: string;
    expiration: Date;
    document_url?: string;
  };
  
  // Choix de l'étudiant
  choix: StudentChoice;
  
  // Métadonnées
  createdAt: Date;
  updatedAt: Date;
  createdBy: string; // ID de l'agent qui a créé
}

// Interface Document
export interface Document {
  id: string;
  studentId: string;
  type: DocumentType;
  status: DocumentStatus;
  url?: string; // URL du fichier uploadé
  uploadedAt?: Date;
  validatedAt?: Date;
  validatedBy?: string; // ID de l'agent qui a validé
  rejectionReason?: string;
  createdAt: Date;
  updatedAt: Date;
}

// Interface Dossier de Bourse
export interface DossierBourse {
  id: string;
  studentId: string;
  status: DossierStatus;
  historique: DossierHistoryEntry[];
  notes_internes: string; // Invisibles à l'étudiant
  createdAt: Date;
  updatedAt: Date;
  assignedTo?: string; // ID de l'agent assigné
}

// Interface Historique du Dossier
export interface DossierHistoryEntry {
  id: string;
  action: string;
  status: DossierStatus;
  description: string;
  performedBy: string; // ID de l'utilisateur
  performedAt: Date;
  metadata?: Record<string, any>;
}

// Interface Paiement
export interface Payment {
  id: string;
  studentId: string;
  type: PaymentType;
  tranche: number; // 1, 2, 3, 4
  montant: number;
  status: PaymentStatus;
  date_limite: Date;
  date_paiement?: Date;
  penalites: number;
  facture_url?: string; // URL de la facture uploadée
  recu_url?: string; // URL du reçu généré
  validatedBy?: string; // ID de l'agent qui a validé
  validatedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

// Interface Cours de Langues
export interface CoursLangue {
  id: string;
  studentId: string;
  langue: LanguageCourse;
  paiements: {
    inscription: Payment;
    livre: Payment;
    tranche1: Payment;
    tranche2: Payment;
  };
  inscrit_le: Date;
  statut: 'actif' | 'termine' | 'abandonne';
}

// Interface Comptabilité - Entrée
export interface EntreeComptable {
  id: string;
  montant: number;
  date: Date;
  type: 'paiement_procedure' | 'paiement_cours' | 'revenus_divers';
  description: string;
  studentId?: string; // Si lié à un étudiant
  paymentId?: string; // Si lié à un paiement
  createdBy: string;
  createdAt: Date;
}

// Interface Comptabilité - Sortie
export interface SortieComptable {
  id: string;
  montant: number;
  date: Date;
  categorie: 'loyer' | 'salaires' | 'fonctionnement' | 'materiels' | 'fournitures' | 'transports' | 'communication' | 'partenaires' | 'divers';
  description: string;
  justificatif_url?: string; // URL du justificatif
  validatedBy?: string; // ID de l'admin qui a validé
  validatedAt?: Date;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

// Interface Notification
export interface Notification {
  id: string;
  userId: string;
  type: 'document_manquant' | 'paiement_valide' | 'retard_paiement' | 'mise_a_jour_dossier';
  titre: string;
  message: string;
  read: boolean;
  createdAt: Date;
  metadata?: Record<string, any>;
}

// Interface Message
export interface Message {
  id: string;
  fromUserId: string;
  toUserId: string;
  subject: string;
  content: string;
  read: boolean;
  createdAt: Date;
  attachments?: string[]; // URLs des pièces jointes
}

// Interface Rapport
export interface Rapport {
  id: string;
  type: 'journalier' | 'mensuel' | 'annuel' | 'paiements' | 'agent' | 'penalites' | 'cours';
  periode: {
    debut: Date;
    fin: Date;
  };
  data: Record<string, any>;
  generatedBy: string;
  generatedAt: Date;
  url?: string; // URL du fichier généré
}

// Constantes pour les montants
export const MONTANTS_BOURSE = {
  TRANCHE_1: 100000, // Inscription
  TRANCHE_2: 500000, // Dépôt des dossiers
  TRANCHE_3: 1000000, // Admission
  TRANCHE_4: 1390000, // Visa
} as const;

export const MONTANTS_MANDARIN = {
  INSCRIPTION: 10000,
  LIVRE: 11000,
  TRANCHE_1: 50000,
  TRANCHE_2: 50000,
  TOTAL: 121000,
} as const;

export const MONTANTS_ANGLAIS = {
  INSCRIPTION: 10000,
  LIVRE: 11000,
  TRANCHE_1: 30000,
  TRANCHE_2: 40000,
  TOTAL: 91000,
} as const;

export const PENALITES = {
  BOURSE: 10000, // par jour après 3 jours
  COURS_INSCRIPTION: 500, // par jour après 14 jours
  COURS_TRANCHE: 1000, // par jour après 30/60 jours
} as const;