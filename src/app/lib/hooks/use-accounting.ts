import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { createClient } from '../supabase/client';
import type {
  EntreeComptable,
  SortieComptable,
  Budget,
  CustomCategory,
  CreateEntreeComptable,
  CreateSortieComptable,
} from '../schemas/accounting.schema';
import {
  createEntreeComptableSchema,
  createSortieComptableSchema,
} from '../schemas/accounting.schema';

const supabase = createClient();

export const ENTREES_KEY = ['entrees_comptables'];
export const SORTIES_KEY = ['sorties_comptables'];
export const BUDGETS_KEY = ['budgets'];
export const CUSTOM_CATEGORIES_KEY = ['custom_categories'];

export function useEntreesComptables() {
  return useQuery({
    queryKey: ENTREES_KEY,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('entrees_comptables')
        .select('*')
        .order('date', { ascending: false });
      if (error) throw error;
      return data as EntreeComptable[];
    },
  });
}

export function useSortiesComptables() {
  return useQuery({
    queryKey: SORTIES_KEY,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('sorties_comptables')
        .select('*')
        .order('date', { ascending: false });
      if (error) throw error;
      return data as SortieComptable[];
    },
  });
}

export function useCreateEntreeComptable() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: CreateEntreeComptable) => {
      const parsed = createEntreeComptableSchema.parse(data);
      const { data: entree, error } = await supabase
        .from('entrees_comptables')
        .insert(parsed)
        .select()
        .single();
      if (error) throw error;
      return entree as EntreeComptable;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ENTREES_KEY });
    },
  });
}

export function useCreateSortieComptable() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: CreateSortieComptable) => {
      const parsed = createSortieComptableSchema.parse(data);
      const { data: sortie, error } = await supabase
        .from('sorties_comptables')
        .insert(parsed)
        .select()
        .single();
      if (error) throw error;
      return sortie as SortieComptable;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: SORTIES_KEY });
    },
  });
}

export function useValidateSortie() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, validatedBy }: { id: string; validatedBy: string }) => {
      const { data, error } = await supabase
        .from('sorties_comptables')
        .update({
          validated_by: validatedBy,
          validated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data as SortieComptable;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: SORTIES_KEY });
    },
  });
}

export function useDeleteEntree() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('entrees_comptables').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ENTREES_KEY });
    },
  });
}

export function useDeleteSortie() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('sorties_comptables').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: SORTIES_KEY });
    },
  });
}

export function useBudgets() {
  return useQuery({
    queryKey: BUDGETS_KEY,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('budgets')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as Budget[];
    },
  });
}

export function useCustomCategories() {
  return useQuery({
    queryKey: CUSTOM_CATEGORIES_KEY,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('custom_categories')
        .select('*')
        .order('nom', { ascending: true });
      if (error) throw error;
      return data as CustomCategory[];
    },
  });
}
