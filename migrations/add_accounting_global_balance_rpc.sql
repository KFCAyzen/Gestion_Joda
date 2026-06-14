-- Solde comptable global (cumulé all-time) calculé côté serveur.
--
-- Remplace le chargement de TOUTES les lignes entrées/sorties côté client
-- (uniquement pour en faire la somme) par deux SUM agrégés en base. La page
-- comptabilité continue de charger les lignes bornées par période pour le
-- rapport/exports, mais le solde global ne ramène plus toute la table.
--
-- ⚠️ MIROIR du calcul TS dans AccountingPage.tsx :
--     totalEntrees = Σ entrees_comptables.montant
--     totalSorties = Σ sorties_comptables.montant WHERE status = 'validated'
--     soldeGlobal  = totalEntrees - totalSorties
--   Toute évolution de cette règle (ex : autres statuts impactant le solde)
--   doit être répercutée des deux côtés.
--
-- SECURITY INVOKER (défaut) : la fonction respecte la RLS comptabilité ; un
-- utilisateur autorisé (admin/SA ou permission accounting.view) obtient la
-- somme complète, exactement comme le SELECT direct actuel. Idempotent.

CREATE OR REPLACE FUNCTION public.accounting_global_balance()
RETURNS TABLE (total_entrees numeric, total_sorties numeric)
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT
    COALESCE((SELECT SUM(montant) FROM public.entrees_comptables), 0)::numeric AS total_entrees,
    COALESCE((SELECT SUM(montant) FROM public.sorties_comptables
              WHERE status = 'validated'), 0)::numeric AS total_sorties;
$$;

GRANT EXECUTE ON FUNCTION public.accounting_global_balance() TO authenticated;
