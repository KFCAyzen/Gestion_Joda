import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
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

export function useStudentsPaginated(page: number, pageSize: number, search?: string) {
  return useQuery({
    queryKey: [...STUDENTS_KEY, 'paginated', page, pageSize, search ?? ''],
    queryFn: async (): Promise<StudentsPaginatedResult> => {
      const from = page * pageSize;
      const to = from + pageSize - 1;

      let query = supabase
        .from('students')
        .select(STUDENT_LIST_SELECT, { count: 'exact' })
        .order('created_at', { ascending: false })
        .range(from, to);

      if (search) {
        query = query.or(
          `nom.ilike.%${search}%,prenom.ilike.%${search}%,email.ilike.%${search}%`
        );
      }

      const { data, error, count } = await query;
      if (error) throw error;
      return { students: data as Student[], total: count ?? 0, page, pageSize };
    },
    staleTime: 60 * 1000,
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

export function useStudentsStats() {
  return useQuery({
    queryKey: [...STUDENTS_KEY, 'stats'],
    queryFn: async () => {
      const total = await supabase.from('students').select('*', { count: 'exact', head: true });
      return { total: total.count || 0 };
    },
    staleTime: 60 * 1000,
  });
}
