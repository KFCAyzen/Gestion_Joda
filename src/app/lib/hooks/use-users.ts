import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../../supabase';
import type { User, CreateUser, UpdateUser } from '../schemas/user.schema';
import { createUserSchema, updateUserSchema } from '../schemas/user.schema';

export const USERS_KEY = ['users'];

export function useUsers() {
  return useQuery({
    queryKey: USERS_KEY,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .order('createdAt', { ascending: false });
      
      if (error) throw error;
      return data as User[];
    },
  });
}

export function useUser(id: string) {
  return useQuery({
    queryKey: [...USERS_KEY, id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', id)
        .single();
      
      if (error) throw error;
      return data as User;
    },
    enabled: !!id,
  });
}

export function useCreateUser() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (data: CreateUser) => {
      const parsed = createUserSchema.parse(data);
      const { data: user, error } = await supabase
        .from('users')
        .insert(parsed)
        .select()
        .single();
      
      if (error) throw error;
      return user as User;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: USERS_KEY });
    },
  });
}

export function useUpdateUser() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: UpdateUser }) => {
      const parsed = updateUserSchema.parse(data);
      const { data: user, error } = await supabase
        .from('users')
        .update(parsed)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return user as User;
    },
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: USERS_KEY });
      queryClient.invalidateQueries({ queryKey: [...USERS_KEY, id] });
    },
  });
}

export function useDeleteUser() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('users').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: USERS_KEY });
    },
  });
}
