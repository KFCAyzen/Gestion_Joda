import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../../supabase';
import type { Student, CreateStudent, UpdateStudent } from '../schemas/student.schema';
import { createStudentSchema, updateStudentSchema } from '../schemas/student.schema';

export const STUDENTS_KEY = ['students'];

export function useStudents() {
  return useQuery({
    queryKey: STUDENTS_KEY,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('students')
        .select('*')
        .order('createdAt', { ascending: false });
      
      if (error) throw error;
      return data as Student[];
    },
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
  });
}
