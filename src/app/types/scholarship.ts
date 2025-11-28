// Types pour le système de bourses d'études en Chine

export interface Student {
    id: string;
    name: string;
    phone: string;
    email: string;
    address: string;
    currentEducation: string;
    nationality: string;
    birthPlace: string;
    birthDate: string;
    idNumber: string;
    idIssueDate: string;
    idIssuePlace: string;
    idExpiryDate: string;
    passportNumber: string;
    gender: string;
    parentName: string;
    parentPhone: string;
    applicationDate: string;
    createdBy?: string;
}

export interface University {
    id: string;
    name: string;
    code: string;
    location: string;
    category: 'Tier 1' | 'Tier 2' | 'Tier 3' | 'Elite';
    applicationFee: string;
    status: 'Disponible' | 'Complet' | 'Fermé' | 'Maintenance';
    programs: string[];
    requirements: {
        minHSK: number;
        minGPA: number;
        documents: string[];
    };
}

export interface ScholarshipApplication {
    id: string;
    studentId: string;
    studentName: string;
    universityCode: string;
    universityName: string;
    desiredProgram: string;
    studyLevel: 'Licence' | 'Master' | 'Doctorat';
    languageLevel: string;
    scholarshipType: 'Complète' | 'Partielle' | 'Aucune';
    applicationFee: string;
    applicationDate: string;
    submissionDate?: string;
    status: 'En attente' | 'En cours' | 'Acceptée' | 'Refusée';
    documents: {
        passport: boolean;
        diploma: boolean;
        transcript: boolean;
        hskCertificate: boolean;
        recommendationLetter: boolean;
        personalStatement: boolean;
    };
    createdBy?: string;
}

export interface ApplicationFee {
    id: string;
    date: string;
    amount: string;
    receivedFrom: string;
    amountInWords: string;
    motif: 'Frais de candidature' | 'Frais de dossier' | 'Frais de visa' | 'Inscription' | 'Autres';
    applicationId: string;
    universityName: string;
    program: string;
    advance: string;
    remaining: string;
    studentSignature: string;
    totalAmount?: string;
    installmentNumber?: number;
    dueDate?: string;
    penalty?: number;
    createdBy?: string;
}

export interface DashboardData {
    totalUniversities: number;
    availableUniversities: number;
    todayApplications: number;
    todayRevenue: number;
    totalStudents: number;
    acceptedApplications: number;
    pendingApplications: number;
    rejectedApplications: number;
}