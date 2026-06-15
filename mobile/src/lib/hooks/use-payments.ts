import { useQuery } from '@tanstack/react-query';
import { supabase } from '../supabase';

/**
 * Type Payment — miroir de `src/app/lib/schemas/payment.schema.ts` (web).
 * À l'étape « package partagé », ces types seront extraits dans un module
 * commun web/natif plutôt que dupliqués.
 */
export type Payment = {
  id: string;
  student_id: string;
  montant: number;
  type: 'bourse' | 'mandarin' | 'anglais' | 'inscription' | 'autre';
  tranche?: number | null;
  status: 'attente' | 'en_validation' | 'paye' | 'retard' | 'annule';
  date_limite?: string | null;
  date_paiement?: string | null;
  penalites?: number;
  created_at: string;
};

export const PAYMENTS_KEY = ['payments'];

/**
 * Port natif de `usePayments` (web). Corps de requête identique : mêmes colonnes,
 * mêmes filtres, mêmes RLS côté serveur. Seul le client Supabase change.
 */
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
  });
}
