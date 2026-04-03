import { create } from 'zustand';
import { supabase } from '../../supabase';
import type { Application, CreateApplication, UpdateApplication } from '../schemas/application.schema';

interface ApplicationsState {
  applications: Application[];
  isLoading: boolean;
  error: string | null;
  fetchApplications: (status?: string) => Promise<void>;
  createApplication: (application: CreateApplication) => Promise<Application>;
  updateApplication: (id: string, application: UpdateApplication) => Promise<Application>;
  updateStatus: (id: string, status: string) => Promise<void>;
  deleteApplication: (id: string) => Promise<void>;
}

export const useApplicationsStore = create<ApplicationsState>((set, get) => ({
  applications: [],
  isLoading: false,
  error: null,

  fetchApplications: async (status?: string) => {
    set({ isLoading: true, error: null });
    try {
      let query = supabase.from('dossier_bourses').select('*').order('created_at', { ascending: false });
      
      if (status && status !== 'all') {
        query = query.eq('status', status);
      }

      const { data, error } = await query;

      if (error) throw error;
      set({ applications: data as Application[], isLoading: false });
    } catch (error: any) {
      set({ error: error.message, isLoading: false });
    }
  },

  createApplication: async (applicationData) => {
    set({ isLoading: true, error: null });
    try {
      const { data, error } = await supabase
        .from('dossier_bourses')
        .insert(applicationData)
        .select()
        .single();

      if (error) throw error;
      set({ applications: [data as Application, ...get().applications], isLoading: false });
      return data as Application;
    } catch (error: any) {
      set({ error: error.message, isLoading: false });
      throw error;
    }
  },

  updateApplication: async (id, applicationData) => {
    set({ isLoading: true, error: null });
    try {
      const { data, error } = await supabase
        .from('dossier_bourses')
        .update(applicationData)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      
      set({
        applications: get().applications.map((a) => (a.id === id ? (data as Application) : a)),
        isLoading: false,
      });
      return data as Application;
    } catch (error: any) {
      set({ error: error.message, isLoading: false });
      throw error;
    }
  },

  updateStatus: async (id, status) => {
    set({ isLoading: true, error: null });
    try {
      const { data, error } = await supabase
        .from('dossier_bourses')
        .update({ status, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      
      set({
        applications: get().applications.map((a) => (a.id === id ? (data as Application) : a)),
        isLoading: false,
      });
    } catch (error: any) {
      set({ error: error.message, isLoading: false });
      throw error;
    }
  },

  deleteApplication: async (id) => {
    set({ isLoading: true, error: null });
    try {
      const { error } = await supabase.from('dossier_bourses').delete().eq('id', id);
      if (error) throw error;
      set({ applications: get().applications.filter((a) => a.id !== id), isLoading: false });
    } catch (error: any) {
      set({ error: error.message, isLoading: false });
      throw error;
    }
  },
}));
