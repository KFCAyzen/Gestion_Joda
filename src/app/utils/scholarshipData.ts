// Utilitaires pour la gestion des données de bourses d'études

import { supabase } from "../supabase";
import { University, Student, ScholarshipApplication, ApplicationFee } from "../types/scholarship";

// Données de test pour les universités chinoises
export const generateUniversityTestData = async (): Promise<boolean> => {
    try {
        const universities = [
            { 
                name: 'Université de Peking', nom: 'Université de Peking', code: 'PKU', location: 'Pékin', 
                category: 'Elite', applicationFee: '150000', status: 'Disponible',
                programmes: ['Médecine', 'Ingénierie', 'Sciences', 'Économie', 'Droit'],
                programmesList: ['Médecine', 'Ingénierie', 'Sciences', 'Économie', 'Droit'],
                requirements: { minHSK: 6, minGPA: 3.5, documents: ['Passeport', 'Diplôme', 'Relevés', 'HSK', 'Recommandation'] }
            },
            { 
                name: 'Université Tsinghua', nom: 'Université Tsinghua', code: 'THU', location: 'Pékin', 
                category: 'Elite', applicationFee: '150000', status: 'Disponible',
                programmes: ['Ingénierie', 'Architecture', 'Sciences', 'Management', 'Arts'],
                programmesList: ['Ingénierie', 'Architecture', 'Sciences', 'Management', 'Arts'],
                requirements: { minHSK: 6, minGPA: 3.5, documents: ['Passeport', 'Diplôme', 'Relevés', 'HSK', 'Recommandation'] }
            },
            { 
                name: 'Université Jiao Tong de Shanghai', nom: 'Université Jiao Tong de Shanghai', code: 'SJTU', location: 'Shanghai', 
                category: 'Tier 1', applicationFee: '120000', status: 'Disponible',
                programmes: ['Ingénierie', 'Médecine', 'Management', 'Sciences', 'Maritime'],
                programmesList: ['Ingénierie', 'Médecine', 'Management', 'Sciences', 'Maritime'],
                requirements: { minHSK: 5, minGPA: 3.0, documents: ['Passeport', 'Diplôme', 'Relevés', 'HSK'] }
            },
            { 
                name: 'Université du Sud Central', nom: 'Université du Sud Central', code: 'CSU', location: 'Changsha', 
                category: 'Tier 2', applicationFee: '85000', status: 'Disponible',
                programmes: ['Médecine', 'Ingénierie', 'Transport', 'Métallurgie', 'Sciences'],
                programmesList: ['Médecine', 'Ingénierie', 'Transport', 'Métallurgie', 'Sciences'],
                requirements: { minHSK: 4, minGPA: 2.5, documents: ['Passeport', 'Diplôme', 'Relevés'] }
            }
        ];

        const { error } = await supabase.from('universities').insert(universities);
        if (error && !error.message.includes('duplicate')) {
            throw error;
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
        const students = [
            {
                nom: 'Kamga',
                prenom: 'Jean Baptiste',
                telephone: '+237 690123456',
                email: 'jean.kamga@email.com',
                age: 28,
                sexe: 'M',
                niveau: 'Licence',
                filiere: 'Informatique',
                langue: 'Chinois',
                diplome_acquis: 'Licence en Informatique',
                created_by: 'system'
            },
            {
                nom: 'Nkomo',
                prenom: 'Marie Claire',
                telephone: '+237 695987654',
                email: 'marie.nkomo@email.com',
                age: 30,
                sexe: 'F',
                niveau: 'Master',
                filiere: 'Économie',
                langue: 'Anglais',
                diplome_acquis: 'Master en Économie',
                created_by: 'system'
            }
        ];

        const { error } = await supabase.from('students').insert(students);
        if (error && !error.message.includes('duplicate')) {
            throw error;
        }

        return true;
    } catch (error) {
        console.error('Erreur génération données étudiants:', error);
        return false;
    }
};

// Fonction principale pour générer toutes les données de test
export const generateAllScholarshipTestData = async (): Promise<boolean> => {
    try {
        const results = await Promise.all([
            generateUniversityTestData(),
            generateStudentTestData()
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
        // Supprimer les données de test (celles créées par 'system')
        await supabase.from('universities').delete().eq('created_by', 'system');
        await supabase.from('students').delete().eq('created_by', 'system');
        
        return true;
    } catch (error) {
        console.error('Erreur nettoyage données:', error);
        return false;
    }
};
