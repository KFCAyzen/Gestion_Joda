import { useQuery } from '@tanstack/react-query';
import { createClient } from '../supabase/client';
import type { Devise } from '../schemas/accounting.schema';

const supabase = createClient();

/*
 * Contrôle de la trésorerie (migration add_controle_tresorerie_phase3.sql) :
 * arrêtés de caisse, clôtures mensuelles, budgets, grille des transports et
 * rapport d'anomalies. Toutes les règles sont tranchées par la base ; ces
 * hooks ne font que lire. Chacun renvoie `null` quand la table ou la fonction
 * n'existe pas encore (migration non appliquée) pour que l'écran l'explique.
 */

export const ARRETES_KEY = ['compta_arretes'];
export const CLOTURES_KEY = ['compta_clotures'];
export const ANOMALIES_KEY = ['compta_anomalies'];
export const BUDGETS_SUIVI_KEY = ['compta_budgets_suivi'];
export const GRILLE_TRANSPORT_KEY = ['compta_grille_transport'];
export const PARAMETRES_COMPLETS_KEY = ['compta_parametres', 'complets'];

export type ArreteStatus = 'soumis' | 'valide' | 'conteste';

export interface ArreteCaisse {
  id: string;
  numero: number;
  devise: Devise;
  /** Valeur faciale → nombre de billets ou pièces. */
  billetage: Record<string, number> | null;
  especes: number;
  mobile_money: number;
  banque: number;
  solde_theorique: number;
  avances_en_cours: number;
  /** Réel − théorique : négatif = manquant, positif = excédent. */
  ecart: number;
  explication: string | null;
  status: ArreteStatus;
  compte_par: string | null;
  compte_par_nom: string | null;
  controle_par: string | null;
  controle_at: string | null;
  controle_commentaire: string | null;
  created_at: string;
}

export interface TotauxDevise {
  entrees: number;
  sorties: number;
  nb_entrees: number;
  nb_sorties: number;
}

export interface ClotureMois {
  id: string;
  /** 1er jour du mois, AAAA-MM-01. */
  mois: string;
  status: 'cloture' | 'rouvert';
  totaux: Partial<Record<Devise, TotauxDevise>>;
  commentaire: string | null;
  cloture_par_nom: string | null;
  cloture_at: string;
  rouvert_par_nom: string | null;
  rouvert_at: string | null;
  motif_reouverture: string | null;
}

export type Gravite = 'haute' | 'moyenne' | 'basse';

export interface Anomalie {
  code: string;
  gravite: Gravite;
  titre: string;
  detail: string;
  montant: number | null;
  devise: string | null;
  personne: string | null;
  ref_table: string | null;
  ref_id: string | null;
  survenu_at: string;
}

export interface BudgetSuivi {
  categorie: string;
  devise: Devise;
  montant_mensuel: number;
  actif: boolean;
  consomme: number;
}

export interface TrajetGrille {
  id: string;
  trajet: string;
  montant_max: number;
  actif: boolean;
}

export interface ComptaParametresComplets {
  seuil_approbation_admin: number;
  delai_justification_heures: number;
  frequence_arrete_jours: number;
  delai_sortie_attente_jours: number;
}

/** « 2026-09-15 » ou un horodatage → « 2026-09 ». */
export function moisKey(date: string): string {
  return date.slice(0, 7);
}

/** Date locale → « AAAA-MM-JJ » (sans passer par l'UTC). */
export function isoDay(d: Date): string {
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

export function useArretes(devise: Devise) {
  return useQuery({
    queryKey: [...ARRETES_KEY, devise],
    queryFn: async (): Promise<ArreteCaisse[] | null> => {
      const { data, error } = await supabase
        .from('compta_arretes')
        .select('*')
        .eq('devise', devise)
        .order('created_at', { ascending: false })
        .limit(100);
      if (error) return null;
      return (data ?? []).map((a) => ({
        ...a,
        especes: Number(a.especes),
        mobile_money: Number(a.mobile_money),
        banque: Number(a.banque),
        solde_theorique: Number(a.solde_theorique),
        avances_en_cours: Number(a.avances_en_cours),
        ecart: Number(a.ecart),
      })) as ArreteCaisse[];
    },
    staleTime: 30 * 1000,
  });
}

/** Toutes les clôtures (une ligne par mois déjà clôturé, même rouvert depuis). */
export function useClotures() {
  return useQuery({
    queryKey: CLOTURES_KEY,
    queryFn: async (): Promise<ClotureMois[] | null> => {
      const { data, error } = await supabase
        .from('compta_clotures')
        .select('*')
        .order('mois', { ascending: false });
      if (error) return null;
      return data as ClotureMois[];
    },
    staleTime: 60 * 1000,
  });
}

/** Mois (« AAAA-MM ») actuellement figés. */
export function useMoisClotures(): Set<string> {
  const { data } = useClotures();
  return new Set((data ?? []).filter((c) => c.status === 'cloture').map((c) => moisKey(c.mois)));
}

/** Rapport d'anomalies sur [debut, fin] (jours inclus, AAAA-MM-JJ). */
export function useAnomalies(debut: string, fin: string, enabled = true) {
  return useQuery({
    queryKey: [...ANOMALIES_KEY, debut, fin],
    enabled,
    queryFn: async (): Promise<Anomalie[] | null> => {
      const { data, error } = await supabase.rpc('compta_anomalies', { p_debut: debut, p_fin: fin });
      if (error) {
        // Fonction absente : migration pas encore appliquée.
        if (error.code === 'PGRST202' || error.code === '42883') return null;
        throw error;
      }
      return ((data ?? []) as Anomalie[]).map((a) => ({
        ...a,
        montant: a.montant === null ? null : Number(a.montant),
      }));
    },
    staleTime: 60 * 1000,
  });
}

export function useBudgetsSuivi(mois: string) {
  return useQuery({
    queryKey: [...BUDGETS_SUIVI_KEY, mois],
    queryFn: async (): Promise<BudgetSuivi[] | null> => {
      const { data, error } = await supabase.rpc('compta_budgets_suivi', { p_mois: mois });
      if (error) return null;
      return ((data ?? []) as BudgetSuivi[]).map((b) => ({
        ...b,
        montant_mensuel: Number(b.montant_mensuel),
        consomme: Number(b.consomme),
      }));
    },
    staleTime: 30 * 1000,
  });
}

export function useGrilleTransport() {
  return useQuery({
    queryKey: GRILLE_TRANSPORT_KEY,
    queryFn: async (): Promise<TrajetGrille[] | null> => {
      const { data, error } = await supabase
        .from('compta_grille_transport')
        .select('id, trajet, montant_max, actif')
        .order('trajet', { ascending: true });
      if (error) return null;
      return (data ?? []).map((t) => ({ ...t, montant_max: Number(t.montant_max) })) as TrajetGrille[];
    },
    staleTime: 5 * 60 * 1000,
  });
}

export function useComptaParametresComplets() {
  return useQuery({
    queryKey: PARAMETRES_COMPLETS_KEY,
    queryFn: async (): Promise<ComptaParametresComplets | null> => {
      const { data, error } = await supabase
        .from('compta_parametres')
        .select('seuil_approbation_admin, delai_justification_heures, frequence_arrete_jours, delai_sortie_attente_jours')
        .maybeSingle();
      if (error || !data) return null;
      return {
        seuil_approbation_admin: Number(data.seuil_approbation_admin),
        delai_justification_heures: Number(data.delai_justification_heures),
        frequence_arrete_jours: Number(data.frequence_arrete_jours),
        delai_sortie_attente_jours: Number(data.delai_sortie_attente_jours),
      };
    },
    staleTime: 5 * 60 * 1000,
  });
}
