// Utilitaires pour la gestion des données de bourses d'études

import { saveData } from "./syncData";
import { University, Student, ScholarshipApplication, ApplicationFee } from "../types/scholarship";

// Données de test pour les universités chinoises
export const generateUniversityTestData = async (): Promise<boolean> => {
    try {
        const universities: University[] = [
            // Elite Universities
            { 
                id: 'pku', name: 'Université de Pékin', code: 'PKU', location: 'Pékin', 
                category: 'Elite', applicationFee: '150000', status: 'Disponible',
                programs: ['Médecine', 'Ingénierie', 'Sciences', 'Économie', 'Droit'],
                requirements: { minHSK: 6, minGPA: 3.5, documents: ['Passeport', 'Diplôme', 'Relevés', 'HSK', 'Recommandation'] }
            },
            { 
                id: 'thu', name: 'Université Tsinghua', code: 'THU', location: 'Pékin', 
                category: 'Elite', applicationFee: '150000', status: 'Disponible',
                programs: ['Ingénierie', 'Architecture', 'Sciences', 'Management', 'Arts'],
                requirements: { minHSK: 6, minGPA: 3.5, documents: ['Passeport', 'Diplôme', 'Relevés', 'HSK', 'Recommandation'] }
            },
            // Tier 1 Universities
            { 
                id: 'sjtu', name: 'Université Jiao Tong de Shanghai', code: 'SJTU', location: 'Shanghai', 
                category: 'Tier 1', applicationFee: '120000', status: 'Disponible',
                programs: ['Ingénierie', 'Médecine', 'Management', 'Sciences', 'Maritime'],
                requirements: { minHSK: 5, minGPA: 3.0, documents: ['Passeport', 'Diplôme', 'Relevés', 'HSK'] }
            },
            // Tier 2 Universities
            { 
                id: 'csu', name: 'Université du Sud Central', code: 'CSU', location: 'Changsha', 
                category: 'Tier 2', applicationFee: '85000', status: 'Disponible',
                programs: ['Médecine', 'Ingénierie', 'Transport', 'Métallurgie', 'Sciences'],
                requirements: { minHSK: 4, minGPA: 2.5, documents: ['Passeport', 'Diplôme', 'Relevés'] }
            }
        ];

        for (const university of universities) {
            await saveData('universities', university);
        }

        return true;
    } catch (error) {
        console.error('Erreur génération données universités:', error);
        return false;
    }
};

// Données de test pour les étudiants
export const generateStudentTestData = async (): Promise<boolean> => {
    try {
        const students: Student[] = [
            {
                id: 'STU001',
                name: 'Jean Baptiste Kamga',
                phone: '+237 690123456',
                email: 'jean.kamga@email.com',
                address: 'Douala, Cameroun',
                currentEducation: 'Licence en Informatique',
                nationality: 'Camerounaise',
                birthPlace: 'Yaoundé',
                birthDate: '1998-05-15',
                idNumber: 'CM123456789',
                idIssueDate: '2020-01-15',
                idIssuePlace: 'Yaoundé',
                idExpiryDate: '2030-01-15',
                passportNumber: 'A1234567',
                gender: 'Masculin',
                parentName: 'Paul Kamga',
                parentPhone: '+237 677123456',
                applicationDate: new Date().toISOString().split('T')[0],
                createdBy: 'system'
            },
            {
                id: 'STU002',
                name: 'Marie Claire Nkomo',
                phone: '+237 695987654',
                email: 'marie.nkomo@email.com',
                address: 'Yaoundé, Cameroun',
                currentEducation: 'Master en Économie',
                nationality: 'Camerounaise',
                birthPlace: 'Douala',
                birthDate: '1996-08-22',
                idNumber: 'CM987654321',
                idIssueDate: '2019-03-10',
                idIssuePlace: 'Douala',
                idExpiryDate: '2029-03-10',
                passportNumber: 'B9876543',
                gender: 'Féminin',
                parentName: 'Catherine Nkomo',
                parentPhone: '+237 678987654',
                applicationDate: new Date().toISOString().split('T')[0],
                createdBy: 'system'
            }
        ];

        for (const student of students) {
            await saveData('students', student);
        }

        return true;
    } catch (error) {
        console.error('Erreur génération données étudiants:', error);
        return false;
    }
};

// Données de test pour les candidatures
export const generateApplicationTestData = async (): Promise<boolean> => {
    try {
        const applications: ScholarshipApplication[] = [
            {
                id: 'APP001',
                studentId: 'STU001',
                studentName: 'Jean Baptiste Kamga',
                universityCode: 'PKU',
                universityName: 'Université de Pékin',
                desiredProgram: 'Master en Informatique',
                studyLevel: 'Master',
                languageLevel: 'HSK 5',
                scholarshipType: 'Complète',
                applicationFee: '150000',
                applicationDate: new Date().toISOString().split('T')[0],
                status: 'En cours',
                documents: {
                    passport: true,
                    diploma: true,
                    transcript: true,
                    hskCertificate: true,
                    recommendationLetter: false,
                    personalStatement: true
                },
                createdBy: 'system'
            },
            {
                id: 'APP002',
                studentId: 'STU002',
                studentName: 'Marie Claire Nkomo',
                universityCode: 'SJTU',
                universityName: 'Université Jiao Tong de Shanghai',
                desiredProgram: 'Doctorat en Économie',
                studyLevel: 'Doctorat',
                languageLevel: 'HSK 6',
                scholarshipType: 'Partielle',
                applicationFee: '120000',
                applicationDate: new Date().toISOString().split('T')[0],
                status: 'Acceptée',
                documents: {
                    passport: true,
                    diploma: true,
                    transcript: true,
                    hskCertificate: true,
                    recommendationLetter: true,
                    personalStatement: true
                },
                createdBy: 'system'
            }
        ];

        for (const application of applications) {
            await saveData('applications', application);
        }

        return true;
    } catch (error) {
        console.error('Erreur génération données candidatures:', error);
        return false;
    }
};

// Données de test pour les frais
export const generateFeeTestData = async (): Promise<boolean> => {
    try {
        const fees: ApplicationFee[] = [
            {
                id: 'FEE001',
                date: new Date().toISOString().split('T')[0],
                amount: '150000',
                receivedFrom: 'Jean Baptiste Kamga',
                amountInWords: 'cent cinquante mille francs CFA',
                motif: 'Frais de candidature',
                applicationId: 'APP001',
                universityName: 'Université de Pékin',
                program: 'Master en Informatique',
                advance: '150000',
                remaining: '0',
                studentSignature: 'Jean Baptiste Kamga',
                createdBy: 'system'
            },
            {
                id: 'FEE002',
                date: new Date().toISOString().split('T')[0],
                amount: '120000',
                receivedFrom: 'Marie Claire Nkomo',
                amountInWords: 'cent vingt mille francs CFA',
                motif: 'Frais de candidature',
                applicationId: 'APP002',
                universityName: 'Université Jiao Tong de Shanghai',
                program: 'Doctorat en Économie',
                advance: '120000',
                remaining: '0',
                studentSignature: 'Marie Claire Nkomo',
                createdBy: 'system'
            }
        ];

        for (const fee of fees) {
            await saveData('applicationFees', fee);
        }

        return true;
    } catch (error) {
        console.error('Erreur génération données frais:', error);
        return false;
    }
};

// Fonction principale pour générer toutes les données de test
export const generateAllScholarshipTestData = async (): Promise<boolean> => {
    try {
        const results = await Promise.all([
            generateUniversityTestData(),
            generateStudentTestData(),
            generateApplicationTestData(),
            generateFeeTestData()
        ]);

        return results.every(result => result === true);
    } catch (error) {
        console.error('Erreur génération données complètes:', error);
        return false;
    }
};

// Fonction pour nettoyer toutes les données
export const clearAllScholarshipData = async (): Promise<boolean> => {
    try {
        // Vider localStorage
        localStorage.removeItem('universities');
        localStorage.removeItem('students');
        localStorage.removeItem('applications');
        localStorage.removeItem('applicationFees');
        
        return true;
    } catch (error) {
        console.error('Erreur nettoyage données:', error);
        return false;
    }
};