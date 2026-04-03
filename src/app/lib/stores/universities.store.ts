import { create } from 'zustand';
import { supabase } from '../../supabase';
import type { University, CreateUniversity, UpdateUniversity } from '../schemas/university.schema';

interface UniversitiesState {
  universities: University[];
  isLoading: boolean;
  error: string | null;
  fetchUniversities: (activeOnly?: boolean) => Promise<void>;
  createUniversity: (university: CreateUniversity) => Promise<University>;
  updateUniversity: (id: string, university: UpdateUniversity) => Promise<University>;
  deleteUniversity: (id: string) => Promise<void>;
}

export const useUniversitiesStore = create<UniversitiesState>((set, get) => ({
  universities: [],
  isLoading: false,
  error: null,

  fetchUniversities: async (activeOnly = true) => {
    set({ isLoading: true, error: null });
    try {
      const { data, error } = await supabase
        .from('universities')
        .select('*')
        .eq('active', activeOnly)
        .order('nom', { ascending: true });

      if (error) throw error;
      set({ universities: data as University[], isLoading: false });
    } catch (error: any) {
      set({ error: error.message, isLoading: false });
    }
  },

  createUniversity: async (universityData) => {
    set({ isLoading: true, error: null });
    try {
      const { data, error } = await supabase
        .from('universities')
        .insert(universityData)
        .select()
        .single();

      if (error) throw error;
      set({ universities: [...get().universities, data as University], isLoading: false });
      return data as University;
    } catch (error: any) {
      set({ error: error.message, isLoading: false });
      throw error;
    }
  },

  updateUniversity: async (id, universityData) => {
    set({ isLoading: true, error: null });
    try {
      const { data, error } = await supabase
        .from('universities')
        .update(universityData)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      
      set({
        universities: get().universities.map((u) => (u.id === id ? (data as University) : u)),
        isLoading: false,
      });
      return data as University;
    } catch (error: any) {
      set({ error: error.message, isLoading: false });
      throw error;
    }
  },

  deleteUniversity: async (id) => {
    set({ isLoading: true, error: null });
    try {
      const { error } = await supabase.from('universities').delete().eq('id', id);
      if (error) throw error;
      set({ universities: get().universities.filter((u) => u.id !== id), isLoading: false });
    } catch (error: any) {
      set({ error: error.message, isLoading: false });
      throw error;
    }
  },
}));
