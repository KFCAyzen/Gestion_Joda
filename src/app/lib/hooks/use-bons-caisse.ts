import { useQuery } from '@tanstack/react-query';
import { createClient } from '../supabase/client';
import type { TrajetGrille } from './use-controle-compta';

const supabase = createClient();

export const BONS_CAISSE_KEY = ['bons_caisse'];
export const COMPTA_PARAMETRES_KEY = ['compta_parametres'];

/**
 * Circuit d'un bon de caisse (migration add_bons_caisse_phase2.sql) :
 * demande → approuve → remis → justifie → cloture ; refuse / annule en cours
 * de route ; justifie → remis quand la justification est rejetée.
 */
export type BonStatus = 'demande' | 'approuve' | 'refuse' | 'remis' | 'justifie' | 'cloture' | 'annule';

export interface BonCaisse {
  id: string;
  numero: number;
  demandeur_id: string | null;
  demandeur_nom: string;
  montant: number;
  categorie: string;
  motif: string;
  student_id: string | null;
  /** Trajet de la grille des transports (phase 3), choisi à la demande. */
  trajet_id?: string | null;
  nb_trajets?: number;
  status: BonStatus;
  decision_par: string | null;
  decision_at: string | null;
  refus_motif: string | null;
  remis_par: string | null;
  remis_at: string | null;
  echeance_justification: string | null;
  reception_confirmee_at: string | null;
  justificatif_path: string | null;
  preuve_mission_path: string | null;
  montant_depense: number | null;
  justifie_at: string | null;
  rejet_justification_motif: string | null;
  controle_par: string | null;
  controle_at: string | null;
  annule_par: string | null;
  annule_at: string | null;
  annulation_motif: string | null;
  created_at: string;
  updated_at: string;
}

export interface ComptaParametres {
  seuil_approbation_admin: number;
  delai_justification_heures: number;
}

/** Valeurs de la migration, utilisées tant que la table n'est pas lisible. */
export const DEFAULT_COMPTA_PARAMETRES: ComptaParametres = {
  seuil_approbation_admin: 5000,
  delai_justification_heures: 48,
};

export function bonNumero(numero: number): string {
  return `BC-${String(numero).padStart(6, '0')}`;
}

/** Argent sorti de la caisse et pas encore clôturé (compte dans la trésorerie). */
export function isEnCours(b: Pick<BonCaisse, 'status'>): boolean {
  return b.status === 'remis' || b.status === 'justifie';
}

/** Remis et non justifié après l'échéance : bloque toute nouvelle demande. */
export function isEnRetard(b: Pick<BonCaisse, 'status' | 'echeance_justification'>, now = Date.now()): boolean {
  return b.status === 'remis' && !!b.echeance_justification && new Date(b.echeance_justification).getTime() < now;
}

/**
 * Position d'un bon de transport par rapport à la grille (miroir de
 * trg_bons_caisse_plafonds). `null` : pas concerné (autre catégorie, ou
 * grille vide/indisponible).
 */
export type PositionGrille =
  | { kind: 'hors_grille' }
  | { kind: 'au_dessus' | 'dans_grille'; trajet: string; plafond: number };

export function positionGrille(
  b: Pick<BonCaisse, 'categorie' | 'montant' | 'trajet_id' | 'nb_trajets'>,
  grille: TrajetGrille[] | null | undefined,
): PositionGrille | null {
  const actifs = (grille ?? []).filter((t) => t.actif);
  if (b.categorie !== 'transports' || actifs.length === 0) return null;
  const t = actifs.find((x) => x.id === b.trajet_id);
  if (!t) return { kind: 'hors_grille' };
  const plafond = t.montant_max * (b.nb_trajets ?? 1);
  return { kind: b.montant > plafond ? 'au_dessus' : 'dans_grille', trajet: t.trajet, plafond };
}

/** Tous les bons visibles (RLS : les siens, ou tous pour la comptabilité). */
export function useBonsCaisse() {
  return useQuery({
    queryKey: BONS_CAISSE_KEY,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('bons_caisse')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(1000);
      if (error) throw error;
      return (data ?? []).map((b) => ({
        ...b,
        montant: Number(b.montant),
        montant_depense: b.montant_depense === null ? null : Number(b.montant_depense),
      })) as BonCaisse[];
    },
    staleTime: 30 * 1000,
  });
}

export function useComptaParametres() {
  return useQuery({
    queryKey: COMPTA_PARAMETRES_KEY,
    queryFn: async (): Promise<ComptaParametres> => {
      const { data, error } = await supabase
        .from('compta_parametres')
        .select('seuil_approbation_admin, delai_justification_heures')
        .maybeSingle();
      if (error || !data) return DEFAULT_COMPTA_PARAMETRES;
      return {
        seuil_approbation_admin: Number(data.seuil_approbation_admin),
        delai_justification_heures: Number(data.delai_justification_heures),
      };
    },
    staleTime: 5 * 60 * 1000,
  });
}
