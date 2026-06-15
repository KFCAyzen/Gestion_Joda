import { useQuery } from '@tanstack/react-query';
import { supabase } from '../supabase';

/** Port des hooks dossier de `src/app/lib/hooks/use-student-portal.ts` (web). */

export type StudentProfile = {
  id: string;
  nom: string;
  prenom: string;
  filiere?: string | null;
  niveau?: string | null;
  choix?: string | null;
  langue?: string | null;
  nationalite?: string | null;
};

export type DossierStatus =
  | 'en_attente'
  | 'en_cours'
  | 'document_manquant'
  | 'document_recu'
  | 'admission_validee'
  | 'admission_rejetee'
  | 'en_attente_universite'
  | 'visa_en_cours'
  | 'termine';

export type Dossier = {
  id: string;
  status: DossierStatus;
  desired_program?: string | null;
  study_level?: string | null;
  university_id?: string | null;
};

/** Profil étudiant du user connecté (même filtre `created_by` que le web). */
export function useStudentProfile(userId?: string) {
  return useQuery({
    queryKey: ['student-profile', userId],
    queryFn: async (): Promise<StudentProfile | null> => {
      const { data, error } = await supabase
        .from('students')
        .select('id, nom, prenom, filiere, niveau, choix, langue, nationalite')
        .eq('created_by', userId!)
        .maybeSingle();
      if (error) throw error;
      return (data as StudentProfile) ?? null;
    },
    enabled: !!userId,
    staleTime: 5 * 60 * 1000,
  });
}

/** Dossier bourse le plus récent de l'étudiant. */
export function useStudentDossier(studentId?: string | null) {
  return useQuery({
    queryKey: ['student-dossier', studentId],
    queryFn: async (): Promise<Dossier | null> => {
      const { data, error } = await supabase
        .from('dossier_bourses')
        .select('id, status, desired_program, study_level, university_id')
        .eq('student_id', studentId!)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return (data as Dossier) ?? null;
    },
    enabled: !!studentId,
    staleTime: 2 * 60 * 1000,
  });
}
