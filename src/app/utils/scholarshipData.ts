// Utilitaires pour la gestion des données de bourses d'études

import { createClient } from "../lib/supabase/client";
import { University, Student, ScholarshipApplication, ApplicationFee } from "../types/scholarship";

const supabase = createClient();

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
        if (error) {
            if (!error.message.includes('duplicate')) {
                console.error('Erreur insertion universités:', error.message);
            }
            return false;
        }

        return true;
    } catch (error: any) {
        console.error('Erreur génération données universités:', error?.message || error);
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
                diplome_acquis: 'Licence en Informatique'
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
                diplome_acquis: 'Master en Économie'
            }
        ];

        const { error } = await supabase.from('students').insert(students);
        if (error) {
            if (!error.message.includes('duplicate')) {
                console.error('Erreur insertion étudiants:', error.message);
            }
            return false;
        }

        return true;
    } catch (error: any) {
        console.error('Erreur génération données étudiants:', error?.message || error);
        return false;
    }
};

// Fonction principale pour générer toutes les données de test
export const generateAllScholarshipTestData = async (): Promise<boolean> => {
    try {
        const univ = await generateUniversityTestData();
        await new Promise(resolve => setTimeout(resolve, 100));
        const students = await generateStudentTestData();

        return univ && students;
    } catch (error: any) {
        console.error('Erreur génération données complètes:', error?.message || error);
        return false;
    }
};

// Fonction pour nettoyer toutes les données
export const clearAllScholarshipData = async (): Promise<boolean> => {
    try {
        // Supprimer les données de test en utilisant des critères spécifiques
        await supabase.from('universities').delete().in('code', ['PKU', 'THU', 'SJTU', 'CSU']);
        await new Promise(resolve => setTimeout(resolve, 100));
        await supabase.from('students').delete().in('email', ['jean.kamga@email.com', 'marie.nkomo@email.com']);
        
        return true;
    } catch (error: any) {
        console.error('Erreur nettoyage données:', error?.message || error);
        return false;
    }
};
