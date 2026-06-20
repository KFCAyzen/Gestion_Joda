-- Module RH — Désignation manuelle des employés du suivi d'appels / call center
-- Remplace la détection par mots-clés sur le poste par deux indicateurs que
-- l'admin coche sur la fiche employé :
--   suivi_appels : l'employé saisit les 6 compteurs d'appels dans ses rapports
--   quota_appels : l'employé est soumis au quota hebdomadaire (300 appels / 90 RDV)
-- Le quota implique toujours la saisie (un call center renseigne ses compteurs).
-- Migration auto-suffisante et idempotente.

ALTER TABLE public.employees
  ADD COLUMN IF NOT EXISTS suivi_appels boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS quota_appels boolean NOT NULL DEFAULT false;

-- Backfill best-effort : reprend l'ancienne détection par mots-clés pour ne pas
-- perdre les postes déjà concernés. L'admin peut ensuite ajuster manuellement.
-- (Les '%' encadrant les motifs absorbent accents/séparateurs : '%secr%taire%'
--  matche « secrétaire » et « secretaire » ; '%call%center%' matche les variantes.)

-- Soumis au quota : les call centers.
UPDATE public.employees
SET quota_appels = true, suivi_appels = true
WHERE quota_appels = false
  AND (
       poste ILIKE '%call%center%'
    OR poste ILIKE '%centre d%appel%'
    OR departement ILIKE '%call%center%'
    OR departement ILIKE '%centre d%appel%'
  );

-- Saisie des compteurs : ensemble plus large (prospection / relation client).
UPDATE public.employees
SET suivi_appels = true
WHERE suivi_appels = false
  AND (
       poste ILIKE '%secr%taire%'
    OR poste ILIKE '%call%center%'
    OR poste ILIKE '%centre d%appel%'
    OR poste ILIKE '%communication%'
    OR poste ILIKE '%responsable local%'
    OR departement ILIKE '%call%center%'
    OR departement ILIKE '%communication%'
  );
