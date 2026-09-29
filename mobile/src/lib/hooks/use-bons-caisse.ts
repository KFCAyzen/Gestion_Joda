import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as FileSystem from 'expo-file-system/legacy';
import { decode } from 'base64-arraybuffer';

import { supabase } from '../supabase';
import { logActivity } from '../activity-log';

/* ============================================================
   Bons de caisse — miroir mobile de src/app/lib/hooks/use-bons-caisse.ts.
   Circuit (migration add_bons_caisse_phase2.sql) :
   demande → approuve → remis → justifie → cloture ; refuse / annule ;
   justifie → remis quand la justification est rejetée. Toutes les règles
   (tiers, seuil admin, délai, blocage) sont tranchées par la base : les
   messages d'erreur remontent tels quels.
   ============================================================ */

type Actor = { id?: string | null; name?: string | null; role?: string | null };

export type BonStatus = 'demande' | 'approuve' | 'refuse' | 'remis' | 'justifie' | 'cloture' | 'annule';

export type BonCaisse = {
  id: string;
  numero: number;
  demandeur_id: string | null;
  demandeur_nom: string;
  montant: number;
  categorie: string;
  motif: string;
  status: BonStatus;
  decision_at: string | null;
  refus_motif: string | null;
  remis_at: string | null;
  echeance_justification: string | null;
  reception_confirmee_at: string | null;
  justificatif_path: string | null;
  preuve_mission_path: string | null;
  montant_depense: number | null;
  justifie_at: string | null;
  rejet_justification_motif: string | null;
  annulation_motif: string | null;
  created_at: string;
};

export type ComptaParametres = { seuil_approbation_admin: number; delai_justification_heures: number };
const DEFAULT_PARAMS: ComptaParametres = { seuil_approbation_admin: 5000, delai_justification_heures: 48 };

export const BONS_KEY = ['bons_caisse'] as const;
const BUCKET = 'justificatifs-comptables';

export const BON_STATUS_LABEL: Record<BonStatus, string> = {
  demande: 'En attente d’approbation',
  approuve: 'Approuvé — à retirer',
  refuse: 'Refusé',
  remis: 'À justifier',
  justifie: 'Justifié — en contrôle',
  cloture: 'Clôturé',
  annule: 'Annulé',
};

export const BON_CATEGORIES = ['transports', 'fournitures', 'communication', 'materiels', 'divers'];
export const BON_CATEGORIE_LABEL: Record<string, string> = {
  transports: 'Transport',
  fournitures: 'Fournitures',
  communication: 'Communication',
  materiels: 'Matériel',
  divers: 'Divers',
  fonctionnement: 'Fonctionnement',
};

export function bonNumero(n: number): string {
  return `BC-${String(n).padStart(6, '0')}`;
}

/** Remis et non justifié après l'échéance : bloque toute nouvelle demande. */
export function isEnRetard(b: Pick<BonCaisse, 'status' | 'echeance_justification'>, now = Date.now()): boolean {
  return b.status === 'remis' && !!b.echeance_justification && new Date(b.echeance_justification).getTime() < now;
}

/** « à justifier sous 31 h » ou « en retard de 2 j ». */
export function echeanceLabel(b: BonCaisse, now = Date.now()): string | null {
  if (b.status !== 'remis' || !b.echeance_justification) return null;
  const diffH = Math.round((new Date(b.echeance_justification).getTime() - now) / 3_600_000);
  const span = (h: number) => (h >= 48 ? `${Math.round(h / 24)} j` : `${Math.max(h, 1)} h`);
  return diffH >= 0 ? `à justifier sous ${span(diffH)}` : `en retard de ${span(-diffH)}`;
}

function normalize(rows: any[] | null): BonCaisse[] {
  return (rows ?? []).map((b) => ({
    ...b,
    montant: Number(b.montant),
    montant_depense: b.montant_depense === null ? null : Number(b.montant_depense),
  }));
}

/** Les bons de l'employé connecté (app agent). */
export function useMesBons(userId?: string) {
  return useQuery({
    queryKey: [...BONS_KEY, 'mine', userId],
    enabled: !!userId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('bons_caisse')
        .select('*')
        .eq('demandeur_id', userId!)
        .order('created_at', { ascending: false })
        .limit(200);
      if (error) throw new Error(error.message);
      return normalize(data);
    },
    staleTime: 30 * 1000,
  });
}

/** Bons à traiter par la comptabilité / l'administration (app admin). */
export function useBonsATraiter() {
  return useQuery({
    queryKey: [...BONS_KEY, 'a-traiter'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('bons_caisse')
        .select('*')
        .in('status', ['demande', 'approuve', 'remis', 'justifie'])
        .order('created_at', { ascending: true })
        .limit(500);
      if (error) throw new Error(error.message);
      return normalize(data);
    },
    staleTime: 30 * 1000,
  });
}

export function useComptaParametres() {
  return useQuery({
    queryKey: ['compta_parametres'],
    queryFn: async (): Promise<ComptaParametres> => {
      const { data, error } = await supabase
        .from('compta_parametres')
        .select('seuil_approbation_admin, delai_justification_heures')
        .maybeSingle();
      if (error || !data) return DEFAULT_PARAMS;
      return {
        seuil_approbation_admin: Number((data as any).seuil_approbation_admin),
        delai_justification_heures: Number((data as any).delai_justification_heures),
      };
    },
    staleTime: 5 * 60 * 1000,
  });
}

function useInvalidateBons() {
  const qc = useQueryClient();
  return () => {
    qc.invalidateQueries({ queryKey: BONS_KEY });
    // Remise et clôture touchent la trésorerie et le livre (app admin).
    qc.invalidateQueries({ queryKey: ['admin', 'treasury'] });
    qc.invalidateQueries({ queryKey: ['admin', 'ledger'] });
  };
}

export function useCreateBon(actor?: Actor) {
  const invalidate = useInvalidateBons();
  return useMutation({
    mutationFn: async (input: { montant: number; categorie: string; motif: string }) => {
      const { data, error } = await supabase
        .from('bons_caisse')
        .insert(input)
        .select('id, numero')
        .single();
      if (error) throw new Error(error.message);
      await logActivity(actor ?? {}, 'accounting_expense', 'bons_caisse', data?.id ?? null,
        `Demande de bon de caisse — ${input.motif}`, { montant: input.montant });
    },
    onSuccess: invalidate,
  });
}

/** Changement d'état ou correction d'un bon ; le trigger décide si c'est permis. */
export function useUpdateBon(actor?: Actor) {
  const invalidate = useInvalidateBons();
  return useMutation({
    mutationFn: async ({ bon, patch, log }: { bon: BonCaisse; patch: Record<string, unknown>; log: string }) => {
      const { error } = await supabase.from('bons_caisse').update(patch).eq('id', bon.id);
      if (error) throw new Error(error.message);
      await logActivity(actor ?? {}, 'accounting_expense', 'bons_caisse', bon.id,
        `${bonNumero(bon.numero)} — ${log}`, { montant: bon.montant });
    },
    onSuccess: invalidate,
  });
}

/** Photo choisie pour une pièce (base64 fourni par ImagePicker). */
export type PieceFile = { uri: string; mimeType: string; base64?: string };

/** Dépose une pièce dans bons/<id du demandeur>/ : seul dossier où il peut écrire. */
async function uploadPiece(userId: string, file: PieceFile): Promise<string> {
  const b64 = file.base64 ?? (await FileSystem.readAsStringAsync(file.uri, { encoding: 'base64' }));
  const ext = file.mimeType === 'application/pdf' ? 'pdf' : file.mimeType === 'image/png' ? 'png' : 'jpg';
  const rand = Math.random().toString(36).slice(2, 10);
  const path = `bons/${userId}/${Date.now()}-${rand}.${ext}`;
  const { error } = await supabase.storage.from(BUCKET).upload(path, decode(b64), { contentType: file.mimeType, upsert: false });
  if (error) throw new Error(`Dépôt de la pièce impossible : ${error.message}`);
  return path;
}

/** Justification par le bénéficiaire : pièces déposées d'abord, puis passage à « justifie ». */
export function useJustifierBon(actor?: Actor) {
  const invalidate = useInvalidateBons();
  return useMutation({
    mutationFn: async ({
      bon,
      montantDepense,
      justificatif,
      preuveMission,
    }: {
      bon: BonCaisse;
      montantDepense: number;
      justificatif: PieceFile | null;
      preuveMission: PieceFile | null;
    }) => {
      if (!actor?.id) throw new Error('Session expirée');
      const justificatif_path = justificatif ? await uploadPiece(actor.id, justificatif) : null;
      const preuve_mission_path = preuveMission ? await uploadPiece(actor.id, preuveMission) : null;
      const { error } = await supabase
        .from('bons_caisse')
        .update({ status: 'justifie', montant_depense: montantDepense, justificatif_path, preuve_mission_path })
        .eq('id', bon.id);
      if (error) throw new Error(error.message);
      await logActivity(actor, 'accounting_expense', 'bons_caisse', bon.id,
        `${bonNumero(bon.numero)} — justifié, dépensé ${montantDepense} F`, { montant: bon.montant });
    },
    onSuccess: invalidate,
  });
}

/** Lien signé (5 min) vers une pièce du bucket privé. */
export async function pieceUrl(path: string): Promise<string | null> {
  const { data, error } = await supabase.storage.from(BUCKET).createSignedUrl(path, 300);
  return error || !data ? null : data.signedUrl;
}
