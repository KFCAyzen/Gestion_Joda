// Utilitaires pour la gestion des données de bourses d'études

import { createClient } from "../lib/supabase/client";
import { University, Student, ScholarshipApplication, ApplicationFee } from "../types/scholarship";

const supabase = createClient();

// Données de test pour les universités chinoises
export const generateUniversityTestData = async (): Promise<boolean> => {
    try {
        const universities = [
            { 
                nom: 'Université de Peking',
                pays: 'Chine',
                ville: 'Pékin',
                programme: 'Médecine, Ingénierie, Sciences, Économie, Droit',
                niveau_etude: 'Licence, Master, Doctorat',
                criteres_admission: 'HSK 6, GPA 3.5, Passeport, Diplôme, Relevés, Recommandation',
                active: true
            },
            { 
                nom: 'Université Tsinghua',
                pays: 'Chine',
                ville: 'Pékin',
                programme: 'Ingénierie, Architecture, Sciences, Management, Arts',
                niveau_etude: 'Licence, Master, Doctorat',
                criteres_admission: 'HSK 6, GPA 3.5, Passeport, Diplôme, Relevés, Recommandation',
                active: true
            },
            { 
                nom: 'Université Jiao Tong de Shanghai',
                pays: 'Chine',
                ville: 'Shanghai',
                programme: 'Ingénierie, Médecine, Management, Sciences, Maritime',
                niveau_etude: 'Licence, Master, Doctorat',
                criteres_admission: 'HSK 5, GPA 3.0, Passeport, Diplôme, Relevés',
                active: true
            },
            { 
                nom: 'Université du Sud Central',
                pays: 'Chine',
                ville: 'Changsha',
                programme: 'Médecine, Ingénierie, Transport, Métallurgie, Sciences',
                niveau_etude: 'Licence, Master',
                criteres_admission: 'HSK 4, GPA 2.5, Passeport, Diplôme, Relevés',
                active: true
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
        await supabase.from('universities').delete().in('nom', ['Université de Peking', 'Université Tsinghua', 'Université Jiao Tong de Shanghai', 'Université du Sud Central']);
        await new Promise(resolve => setTimeout(resolve, 100));
        await supabase.from('students').delete().in('email', ['jean.kamga@email.com', 'marie.nkomo@email.com']);
        
        return true;
    } catch (error: any) {
        console.error('Erreur nettoyage données:', error?.message || error);
        return false;
    }
};
