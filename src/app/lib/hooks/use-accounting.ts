import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { createClient } from '../supabase/client';
import type {
  EntreeComptable,
  SortieComptable,
  Budget,
  CustomCategory,
  CreateEntreeComptable,
  CreateSortieComptable,
  Devise,
} from '../schemas/accounting.schema';
import {
  createEntreeComptableSchema,
  createSortieComptableSchema,
} from '../schemas/accounting.schema';

const supabase = createClient();

export const ENTREES_KEY = ['entrees_comptables'];
export const SORTIES_KEY = ['sorties_comptables'];
export const SOLDE_KEY = ['comptabilite_solde'];
export const BUDGETS_KEY = ['budgets'];
export const CUSTOM_CATEGORIES_KEY = ['custom_categories'];

/**
 * Solde de trésorerie global, lu depuis le cache maintenu par triggers
 * (migration add_treasury_balance_cache.sql). Lecture O(1) : une seule ligne,
 * aucun scan de l'historique.
 *
 * Retourne `null` si le cache est indisponible (table pas encore migrée) :
 * l'appelant retombe alors sur le calcul client à partir des lignes chargées.
 */
export function useSoldeCourant(devise: Devise = 'FCFA') {
  return useQuery({
    queryKey: [...SOLDE_KEY, devise],
    queryFn: async (): Promise<number | null> => {
      const { data, error } = await supabase
        .from('comptabilite_solde')
        .select('solde')
        .eq('devise', devise)
        .maybeSingle();
      if (error || !data) return null;
      return Number(data.solde);
    },
    staleTime: 30 * 1000,
  });
}

/**
 * Repli du solde global lorsque le cache est indisponible (migration
 * add_treasury_balance_cache.sql pas encore appliquée). Ne charge QUE la colonne
 * `montant` (+ `status` pour les sorties), pas les lignes complètes, et ne
 * s'exécute que si `enabled` est vrai. Une fois la migration en place, ce repli
 * ne tourne jamais.
 */
export function useSoldeCourantFallback(enabled: boolean, devise: Devise = 'FCFA') {
  return useQuery({
    queryKey: [...SOLDE_KEY, 'fallback', devise],
    enabled,
    queryFn: async (): Promise<number> => {
      const [entRes, sorRes] = await Promise.all([
        supabase.from('entrees_comptables').select('montant').eq('devise', devise),
        supabase.from('sorties_comptables').select('montant, status').eq('devise', devise),
      ]);
      const e = (entRes.data ?? []).reduce(
        (s, r) => s + Number((r as { montant: number }).montant || 0),
        0,
      );
      const so = (sorRes.data ?? [])
        .filter((r) => (r as { status?: string }).status === 'validated')
        .reduce((s, r) => s + Number((r as { montant: number }).montant || 0), 0);
      return e - so;
    },
    staleTime: 30 * 1000,
  });
}

/** Bornes ISO [start, end) pour ne charger que les opérations d'une période. */
export type DateBounds = { start: string; end: string };

export function useEntreesComptables(bounds?: DateBounds, devise?: Devise) {
  return useQuery({
    queryKey: [...ENTREES_KEY, bounds?.start ?? 'all', bounds?.end ?? 'all', devise ?? 'all'],
    queryFn: async () => {
      let q = supabase
        .from('entrees_comptables')
        .select('*')
        .order('date', { ascending: false });
      if (bounds) q = q.gte('date', bounds.start).lt('date', bounds.end);
      if (devise) q = q.eq('devise', devise);
      const { data, error } = await q;
      if (error) throw error;
      return data as EntreeComptable[];
    },
  });
}

export function useSortiesComptables(bounds?: DateBounds, devise?: Devise) {
  return useQuery({
    queryKey: [...SORTIES_KEY, bounds?.start ?? 'all', bounds?.end ?? 'all', devise ?? 'all'],
    queryFn: async () => {
      let q = supabase
        .from('sorties_comptables')
        .select('*')
        .order('date', { ascending: false });
      if (bounds) q = q.gte('date', bounds.start).lt('date', bounds.end);
      if (devise) q = q.eq('devise', devise);
      const { data, error } = await q;
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
