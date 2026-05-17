import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { createClient } from '../supabase/client';
import type { Payment, CreatePayment, UpdatePayment } from '../schemas/payment.schema';
import { createPaymentSchema, updatePaymentSchema } from '../schemas/payment.schema';

const supabase = createClient();

export const PAYMENTS_KEY = ['payments'];

export function usePayments(filters?: { studentId?: string; status?: string; type?: string }) {
  return useQuery({
    queryKey: [...PAYMENTS_KEY, filters ?? {}],
    queryFn: async () => {
      let query = supabase
        .from('payments')
        .select('*')
        .order('created_at', { ascending: false });

      if (filters?.studentId) query = query.eq('student_id', filters.studentId);
      if (filters?.status) query = query.eq('status', filters.status);
      if (filters?.type) query = query.eq('type', filters.type);

      const { data, error } = await query;
      if (error) throw error;
      return data as Payment[];
    },
    staleTime: 30 * 1000,
  });
}

export function usePayment(id: string) {
  return useQuery({
    queryKey: [...PAYMENTS_KEY, id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('payments')
        .select('*')
        .eq('id', id)
        .single();
      if (error) throw error;
      return data as Payment;
    },
    enabled: !!id,
    staleTime: 30 * 1000,
  });
}

export function useCreatePayment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: CreatePayment) => {
      const parsed = createPaymentSchema.parse(data);
      const { data: payment, error } = await supabase
        .from('payments')
        .insert(parsed)
        .select()
        .single();
      if (error) throw error;
      return payment as Payment;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: PAYMENTS_KEY });
    },
  });
}

export function useUpdatePayment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: UpdatePayment }) => {
      const parsed = updatePaymentSchema.parse(data);
      const { data: payment, error } = await supabase
        .from('payments')
        .update(parsed)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return payment as Payment;
    },
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: PAYMENTS_KEY });
      queryClient.invalidateQueries({ queryKey: [...PAYMENTS_KEY, id] });
    },
  });
}

export function useValidatePayment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, validatedBy }: { id: string; validatedBy: string }) => {
      const nowIso = new Date().toISOString();
      const { data, error } = await supabase
        .from('payments')
        .update({
          status: 'paye',
          validated_by: validatedBy,
          validated_at: nowIso,
          date_paiement: nowIso,
        })
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data as Payment;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: PAYMENTS_KEY });
    },
  });
}

export function useDeletePayment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('payments').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: PAYMENTS_KEY });
    },
  });
}
