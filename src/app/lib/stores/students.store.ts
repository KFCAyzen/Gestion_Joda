import { create } from 'zustand';
import { supabase } from '../../supabase';
import type { Student, CreateStudent, UpdateStudent } from '../schemas/student.schema';

interface StudentsState {
  students: Student[];
  isLoading: boolean;
  error: string | null;
  fetchStudents: () => Promise<void>;
  createStudent: (student: CreateStudent) => Promise<Student>;
  updateStudent: (id: string, student: UpdateStudent) => Promise<Student>;
  deleteStudent: (id: string) => Promise<void>;
}

export const useStudentsStore = create<StudentsState>((set, get) => ({
  students: [],
  isLoading: false,
  error: null,

  fetchStudents: async () => {
    set({ isLoading: true, error: null });
    try {
      const { data, error } = await supabase
        .from('students')
        .select('*')
        .order('createdAt', { ascending: false });

      if (error) throw error;
      set({ students: data as Student[], isLoading: false });
    } catch (error: any) {
      set({ error: error.message, isLoading: false });
    }
  },

  createStudent: async (studentData) => {
    set({ isLoading: true, error: null });
    try {
      const { data, error } = await supabase
        .from('students')
        .insert(studentData)
        .select()
        .single();

      if (error) throw error;
      set({ students: [data as Student, ...get().students], isLoading: false });
      return data as Student;
    } catch (error: any) {
      set({ error: error.message, isLoading: false });
      throw error;
    }
  },

  updateStudent: async (id, studentData) => {
    set({ isLoading: true, error: null });
    try {
      const { data, error } = await supabase
        .from('students')
        .update(studentData)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      
      set({
        students: get().students.map((s) => (s.id === id ? (data as Student) : s)),
        isLoading: false,
      });
      return data as Student;
    } catch (error: any) {
      set({ error: error.message, isLoading: false });
      throw error;
    }
  },

  deleteStudent: async (id) => {
    set({ isLoading: true, error: null });
    try {
      const { error } = await supabase.from('students').delete().eq('id', id);
      if (error) throw error;
      set({ students: get().students.filter((s) => s.id !== id), isLoading: false });
    } catch (error: any) {
      set({ error: error.message, isLoading: false });
      throw error;
    }
  },
}));
