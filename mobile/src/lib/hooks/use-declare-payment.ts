import { useMutation, useQueryClient } from '@tanstack/react-query';
import * as FileSystem from 'expo-file-system/legacy';
import { decode } from 'base64-arraybuffer';

import { apiFetch } from '../api';
import { supabase } from '../supabase';
import { PAYMENTS_KEY, type Payment } from './use-payments';

const BUCKET = 'student-documents';

/** Preuve de paiement choisie (image ou PDF) à uploader avant déclaration. */
export type ProofFile = {
  uri: string;
  name: string;
  mimeType: string;
  /** base64 déjà fourni (images ImagePicker) ; sinon lu depuis `uri`. */
  base64?: string;
};

export type DeclarePaymentInput = {
  studentId: string;
  payment_id: string | null;
  type: Payment['type'];
  tranche_num: number;
  /** Montant attendu de la tranche. */
  montant_tranche: number;
  /** Montant réellement déclaré (= tranche si complet, sinon acompte). */
  montant_declare: number;
  is_avance: boolean;
  proof?: ProofFile | null;
};

/**
 * Déclare un paiement — miroir natif de `useDeclarePayment` (web) :
 * upload optionnel de la preuve dans `student-documents/payment-proofs/...`
 * puis POST `/api/declare-payment` (auth Bearer). Le staff valide ensuite.
 */
export function useDeclarePayment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      studentId,
      payment_id,
      type,
      tranche_num,
      montant_tranche,
      montant_declare,
      is_avance,
      proof,
    }: DeclarePaymentInput) => {
      let proof_url: string | undefined;

      if (proof) {
        let b64 = proof.base64;
        if (!b64) b64 = await FileSystem.readAsStringAsync(proof.uri, { encoding: 'base64' });
        const ext = (proof.name.split('.').pop() || proof.mimeType.split('/').pop() || 'bin').toLowerCase();
        const path = `payment-proofs/${studentId}/${Date.now()}.${ext}`;

        const { error: upErr } = await supabase.storage
          .from(BUCKET)
          .upload(path, decode(b64), { contentType: proof.mimeType, upsert: true });
        if (upErr) throw new Error("Erreur lors de l'envoi de la preuve");

        proof_url = supabase.storage.from(BUCKET).getPublicUrl(path).data.publicUrl;
      }

      const res = await apiFetch('/api/declare-payment', {
        method: 'POST',
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

      if (!res.ok) {
        let detail = '';
        try {
          const body = (await res.json()) as { error?: string };
          if (body?.error) detail = body.error;
        } catch {
          /* ignore */
        }
        throw new Error(detail || `Échec de la déclaration (HTTP ${res.status}).`);
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: PAYMENTS_KEY });
    },
  });
}
