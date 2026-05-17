import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { createClient } from '../supabase/client';
import type { Payment } from '../schemas/payment.schema';
import type { Application } from '../schemas/application.schema';

const supabase = createClient();

// ── Query keys ──────────────────────────────────────────────────────────────

export const STUDENT_PROFILE_KEY = ['student_profile'] as const;
export const STUDENT_PAYMENTS_KEY = ['student_payments'] as const;
export const STUDENT_DOSSIER_KEY = ['student_dossier'] as const;
export const STUDENT_UNIVERSITY_KEY = ['student_university'] as const;
export const STUDENT_LAST_MESSAGE_KEY = ['student_last_message'] as const;

// ── Types ────────────────────────────────────────────────────────────────────

export interface StudentProfile {
  id: string;
  choix: string;
  langue: string;
  nom: string;
  prenom: string;
  email: string;
  telephone: string | null;
  niveau: string;
  filiere: string;
  nationalite: string | null;
}

// ── Hooks ────────────────────────────────────────────────────────────────────

/** Profil étudiant (lookup par auth user id via created_by) */
export function useStudentProfile(userId: string) {
  return useQuery({
    queryKey: [...STUDENT_PROFILE_KEY, userId],
    queryFn: async (): Promise<StudentProfile> => {
      const { data, error } = await supabase
        .from('students')
        .select('id, choix, langue, nom, prenom, email, telephone, niveau, filiere, nationalite')
        .eq('created_by', userId)
        .single();
      if (error) throw error;
      return data as StudentProfile;
    },
    enabled: !!userId,
  });
}

/** Paiements de l'étudiant connecté (via route API sécurisée) */
export function useStudentPayments() {
  return useQuery({
    queryKey: [...STUDENT_PAYMENTS_KEY],
    queryFn: async (): Promise<Payment[]> => {
      const res = await fetch('/api/student-payments');
      if (!res.ok) throw new Error('Erreur chargement paiements');
      const data = await res.json();
      return Array.isArray(data) ? (data as Payment[]) : [];
    },
  });
}

/** Dossier bourse de l'étudiant */
export function useStudentDossier(studentId: string | null) {
  return useQuery({
    queryKey: [...STUDENT_DOSSIER_KEY, studentId],
    queryFn: async (): Promise<Application | null> => {
      const { data, error } = await supabase
        .from('dossier_bourses')
        .select('*')
        .eq('student_id', studentId!)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return (data as Application) ?? null;
    },
    enabled: !!studentId,
  });
}

/** Nom de l'université du dossier */
export function useStudentUniversity(universityId: string | null | undefined) {
  return useQuery({
    queryKey: [...STUDENT_UNIVERSITY_KEY, universityId],
    queryFn: async (): Promise<string | null> => {
      const { data, error } = await supabase
        .from('universities')
        .select('nom')
        .eq('id', universityId!)
        .single();
      if (error) throw error;
      return data?.nom ?? null;
    },
    enabled: !!universityId,
  });
}

/** Dernier message reçu + nom de l'agent expéditeur */
export function useStudentLastMessage(userId: string) {
  return useQuery({
    queryKey: [...STUDENT_LAST_MESSAGE_KEY, userId],
    queryFn: async () => {
      const { data: lastMsg } = await supabase
        .from('messages')
        .select('from_user_id, content')
        .eq('to_user_id', userId)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (!lastMsg) return { agentName: 'Votre agent', preview: '' };

      const { data: agentUser } = await supabase
        .from('users')
        .select('name')
        .eq('id', lastMsg.from_user_id)
        .maybeSingle();

      return {
        agentName: agentUser?.name ?? 'Votre agent',
        preview: ((lastMsg.content as string) ?? '').slice(0, 40) + '…',
      };
    },
    enabled: !!userId,
  });
}

// ── Mutations ─────────────────────────────────────────────────────────────────

export interface DeclarePaymentInput {
  studentId: string | null;
  proofFile: File | null;
  payment_id: string | null;
  type: string;
  tranche_num: number;
  montant_declare: number;
  montant_tranche: number;
  is_avance: boolean;
}

/** Déclare un paiement : upload preuve dans Supabase Storage puis appel API */
export function useDeclarePayment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      studentId,
      proofFile,
      payment_id,
      type,
      tranche_num,
      montant_declare,
      montant_tranche,
      is_avance,
    }: DeclarePaymentInput) => {
      let proof_url: string | undefined;

      if (proofFile && studentId) {
        const ext = proofFile.name.split('.').pop() ?? 'bin';
        const path = `payment-proofs/${studentId}/${Date.now()}.${ext}`;
        const { error: storageError } = await supabase.storage
          .from('student-documents')
          .upload(path, proofFile, { upsert: true });
        if (storageError) throw new Error("Erreur lors de l'envoi de la preuve");
        const { data: { publicUrl } } = supabase.storage
          .from('student-documents')
          .getPublicUrl(path);
        proof_url = publicUrl;
      }

      const res = await fetch('/api/declare-payment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          payment_id,
          type,
          tranche_num,
          montant_declare,
          montant_tranche,
          proof_url,
          is_avance,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Erreur serveur');
      return data;
    },

    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: STUDENT_PAYMENTS_KEY });
    },
  });
}
