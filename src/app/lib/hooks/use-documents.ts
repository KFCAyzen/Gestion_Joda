import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../../supabase';
import type { Document, CreateDocument, UpdateDocument } from '../schemas/document.schema';
import { createDocumentSchema, updateDocumentSchema } from '../schemas/document.schema';

export const DOCUMENTS_KEY = ['documents'];

export function useDocuments(studentId?: string) {
  return useQuery({
    queryKey: [...DOCUMENTS_KEY, studentId ?? 'all'],
    queryFn: async () => {
      let query = supabase
        .from('documents')
        .select('*')
        .order('created_at', { ascending: false });

      if (studentId) query = query.eq('student_id', studentId);

      const { data, error } = await query;
      if (error) throw error;
      return data as Document[];
    },
  });
}

export function useCreateDocument() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: CreateDocument) => {
      const parsed = createDocumentSchema.parse(data);
      const { data: doc, error } = await supabase
        .from('documents')
        .insert(parsed)
        .select()
        .single();
      if (error) throw error;
      return doc as Document;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: DOCUMENTS_KEY });
    },
  });
}

export function useUpdateDocument() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: UpdateDocument }) => {
      const parsed = updateDocumentSchema.parse(data);
      const { data: doc, error } = await supabase
        .from('documents')
        .update(parsed)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return doc as Document;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: DOCUMENTS_KEY });
    },
  });
}

export function useValidateDocument() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      validatedBy,
      isValid,
      rejectionReason,
    }: {
      id: string;
      validatedBy: string;
      isValid: boolean;
      rejectionReason?: string;
    }) => {
      const { data, error } = await supabase
        .from('documents')
        .update({
          status: isValid ? 'valide' : 'non_conforme',
          validated_by: validatedBy,
          validated_at: new Date().toISOString(),
          rejection_reason: isValid ? null : (rejectionReason ?? null),
        })
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data as Document;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: DOCUMENTS_KEY });
    },
  });
}

export function useDeleteDocument() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('documents').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: DOCUMENTS_KEY });
    },
  });
}
