import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../../supabase';
import type { Application, CreateApplication, UpdateApplication } from '../schemas/application.schema';
import { createApplicationSchema, updateApplicationSchema } from '../schemas/application.schema';

export const APPLICATIONS_KEY = ['applications'];

export function useApplications(status?: string) {
  return useQuery({
    queryKey: [...APPLICATIONS_KEY, status],
    queryFn: async () => {
      let query = supabase
        .from('dossier_bourses')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (status && status !== 'all') {
        query = query.eq('status', status);
      }
      
      const { data, error } = await query;
      if (error) throw error;
      return data as Application[];
    },
  });
}

export function useApplication(id: string) {
  return useQuery({
    queryKey: [...APPLICATIONS_KEY, id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('dossier_bourses')
        .select('*')
        .eq('id', id)
        .single();
      
      if (error) throw error;
      return data as Application;
    },
    enabled: !!id,
  });
}

export function useCreateApplication() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (data: CreateApplication) => {
      const parsed = createApplicationSchema.parse(data);
      const { data: application, error } = await supabase
        .from('dossier_bourses')
        .insert(parsed)
        .select()
        .single();
      
      if (error) throw error;
      return application as Application;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: APPLICATIONS_KEY });
    },
  });
}

export function useUpdateApplication() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: UpdateApplication }) => {
      const parsed = updateApplicationSchema.parse(data);
      const { data: application, error } = await supabase
        .from('dossier_bourses')
        .update(parsed)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return application as Application;
    },
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: APPLICATIONS_KEY });
      queryClient.invalidateQueries({ queryKey: [...APPLICATIONS_KEY, id] });
    },
  });
}

export function useUpdateApplicationStatus() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { data, error } = await supabase
        .from('dossier_bourses')
        .update({ status, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data as Application;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: APPLICATIONS_KEY });
    },
  });
}

export function useDeleteApplication() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('dossier_bourses').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: APPLICATIONS_KEY });
    },
  });
}

export function useApplicationsStats() {
  return useQuery({
    queryKey: [...APPLICATIONS_KEY, 'stats'],
    queryFn: async () => {
      const total = await supabase.from('dossier_bourses').select('*', { count: 'exact', head: true });
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const todayCount = await supabase.from('dossier_bourses').select('*', { count: 'exact', head: true }).gte('created_at', today.toISOString());
      return { total: total.count || 0, today: todayCount.count || 0 };
    },
  });
}
