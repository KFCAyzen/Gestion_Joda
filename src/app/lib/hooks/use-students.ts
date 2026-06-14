import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import { createClient } from '../supabase/client';
import type { Student, CreateStudent, UpdateStudent } from '../schemas/student.schema';
import { createStudentSchema, updateStudentSchema } from '../schemas/student.schema';

const supabase = createClient();

export const STUDENTS_KEY = ['students'];

const STUDENT_LIST_SELECT =
  'id, nom, prenom, email, telephone, age, sexe, niveau, filiere, langue, diplome_acquis, choix, nationalite, user_id, created_by, created_at';

export function useStudents() {
  return useQuery({
    queryKey: STUDENTS_KEY,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('students')
        .select(STUDENT_LIST_SELECT)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as Student[];
    },
    staleTime: 60 * 1000,
  });
}

export interface StudentsPaginatedResult {
  students: Student[];
  total: number;
  page: number;
  pageSize: number;
}

export interface StudentsQueryFilters {
  /** Recherche plein texte sur nom/prénom/email/téléphone/filière/niveau */
  search?: string;
  /** "M" | "F" — toute autre valeur (ou "all") ne filtre pas */
  gender?: string;
  /** "local" | "international" — miroir SQL de isInternational(). "all" ne filtre pas */
  profile?: string;
}

/**
 * Applique les mêmes filtres que la liste étudiants côté serveur.
 * Le filtre "profile" reflète isInternational() de types/payment-config.ts :
 *   international = nationalité renseignée ET ≠ camerounais/camerounaise
 *   local        = nationalité nulle OU camerounais/camerounaise
 * (les valeurs de nationalité sont normalisées à l'insertion : "Camerounais"
 * pour les locaux, donc pas de trim SQL nécessaire — ilike gère la casse.)
 */
function applyStudentFilters<T>(query: T, filters: StudentsQueryFilters): T {
  const { search, gender, profile } = filters;
  // `query` est un PostgrestFilterBuilder ; on garde le typage générique pour
  // réutiliser cette fonction sur la requête liste et la requête de comptage.
  let q = query as any;

  const trimmed = search?.trim();
  if (trimmed) {
    q = q.or(
      `nom.ilike.%${trimmed}%,prenom.ilike.%${trimmed}%,email.ilike.%${trimmed}%,telephone.ilike.%${trimmed}%,filiere.ilike.%${trimmed}%,niveau.ilike.%${trimmed}%`
    );
  }
  if (gender === 'M' || gender === 'F') {
    q = q.eq('sexe', gender);
  }
  if (profile === 'local') {
    q = q.or('nationalite.is.null,nationalite.ilike.camerounais,nationalite.ilike.camerounaise');
  } else if (profile === 'international') {
    q = q
      .not('nationalite', 'is', null)
      .not('nationalite', 'ilike', 'camerounais')
      .not('nationalite', 'ilike', 'camerounaise');
  }
  return q as T;
}

export function useStudentsPaginated(
  page: number,
  pageSize: number,
  filters: StudentsQueryFilters = {}
) {
  const { search, gender, profile } = filters;
  return useQuery({
    queryKey: [
      ...STUDENTS_KEY,
      'paginated',
      page,
      pageSize,
      search?.trim() ?? '',
      gender ?? 'all',
      profile ?? 'all',
    ],
    queryFn: async (): Promise<StudentsPaginatedResult> => {
      const from = page * pageSize;
      const to = from + pageSize - 1;

      let query = supabase
        .from('students')
        .select(STUDENT_LIST_SELECT, { count: 'exact' })
        .order('created_at', { ascending: false })
        .range(from, to);

      query = applyStudentFilters(query, filters);

      const { data, error, count } = await query;
      if (error) throw error;
      return { students: data as Student[], total: count ?? 0, page, pageSize };
    },
    staleTime: 60 * 1000,
    // Garde la page précédente visible pendant le chargement de la suivante
    // (pas de flash de spinner à chaque changement de page/filtre).
    placeholderData: keepPreviousData,
  });
}

export function useStudent(id: string) {
  return useQuery({
    queryKey: [...STUDENTS_KEY, id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('students')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;
      return data as Student;
    },
    enabled: !!id,
    staleTime: 60 * 1000,
  });
}

export function useCreateStudent() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: CreateStudent) => {
      const parsed = createStudentSchema.parse(data);
      const { data: student, error } = await supabase
        .from('students')
        .insert(parsed)
        .select()
        .single();

      if (error) throw error;
      return student as Student;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: STUDENTS_KEY });
    },
  });
}

export function useUpdateStudent() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: UpdateStudent }) => {
      const parsed = updateStudentSchema.parse(data);
      const { data: student, error } = await supabase
        .from('students')
        .update(parsed)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return student as Student;
    },
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: STUDENTS_KEY });
      queryClient.invalidateQueries({ queryKey: [...STUDENTS_KEY, id] });
    },
  });
}

export function useDeleteStudent() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('students').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: STUDENTS_KEY });
    },
  });
}

export interface StudentsStats {
  total: number;
  women: number;
  men: number;
  withLanguages: number;
}

/**
 * Compteurs globaux (non filtrés) pour les cartes de statistiques.
 * Chaque compteur est une requête `head: true` (aucune ligne transférée, juste
 * le count) — bien moins coûteux que de ramener toute la table pour compter en JS.
 */
export function useStudentsStats() {
  return useQuery({
    queryKey: [...STUDENTS_KEY, 'stats'],
    queryFn: async (): Promise<StudentsStats> => {
      const [total, women, men, withLanguages] = await Promise.all([
        supabase.from('students').select('*', { count: 'exact', head: true }),
        supabase.from('students').select('*', { count: 'exact', head: true }).eq('sexe', 'F'),
        supabase.from('students').select('*', { count: 'exact', head: true }).eq('sexe', 'M'),
        supabase
          .from('students')
          .select('*', { count: 'exact', head: true })
          .not('langue', 'is', null)
          .neq('langue', ''),
      ]);
      return {
        total: total.count ?? 0,
        women: women.count ?? 0,
        men: men.count ?? 0,
        withLanguages: withLanguages.count ?? 0,
      };
    },
    staleTime: 60 * 1000,
  });
}
