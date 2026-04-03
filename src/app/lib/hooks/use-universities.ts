import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../../supabase';
import type { University, CreateUniversity, UpdateUniversity } from '../schemas/university.schema';
import { createUniversitySchema, updateUniversitySchema } from '../schemas/university.schema';

export const UNIVERSITIES_KEY = ['universities'];

export function useUniversities(activeOnly = true) {
  return useQuery({
    queryKey: [...UNIVERSITIES_KEY, activeOnly],
    queryFn: async () => {
      let query = supabase
        .from('universities')
        .select('*')
        .order('nom', { ascending: true });
      
      if (activeOnly) {
        query = query.eq('active', true);
      }
      
      const { data, error } = await query;
      if (error) throw error;
      return data as University[];
    },
  });
}

export function useUniversity(id: string) {
  return useQuery({
    queryKey: [...UNIVERSITIES_KEY, id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('universities')
        .select('*')
        .eq('id', id)
        .single();
      
      if (error) throw error;
      return data as University;
    },
    enabled: !!id,
  });
}

export function useCreateUniversity() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (data: CreateUniversity) => {
      const parsed = createUniversitySchema.parse(data);
      const { data: university, error } = await supabase
        .from('universities')
        .insert(parsed)
        .select()
        .single();
      
      if (error) throw error;
      return university as University;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: UNIVERSITIES_KEY });
    },
  });
}

export function useUpdateUniversity() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: UpdateUniversity }) => {
      const parsed = updateUniversitySchema.parse(data);
      const { data: university, error } = await supabase
        .from('universities')
        .update(parsed)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return university as University;
    },
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: UNIVERSITIES_KEY });
      queryClient.invalidateQueries({ queryKey: [...UNIVERSITIES_KEY, id] });
    },
  });
}

export function useDeleteUniversity() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('universities').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: UNIVERSITIES_KEY });
    },
  });
}

export function useUniversitiesStats() {
  return useQuery({
    queryKey: [...UNIVERSITIES_KEY, 'stats'],
    queryFn: async () => {
      const total = await supabase.from('universities').select('*', { count: 'exact', head: true });
      const available = await supabase.from('universities').select('*', { count: 'exact', head: true }).eq('status', 'Disponible').eq('active', true);
      return { total: total.count || 0, available: available.count || 0 };
    },
  });
}
