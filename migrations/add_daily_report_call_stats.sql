-- Module RH — Statistiques d'appels dans les rapports journaliers
-- Ajoute 6 compteurs aux rapports journaliers, renseignés par les postes
-- de prospection / relation client (secrétaire, call center, communication,
-- responsable local). Champs additionnables côté admin pour des stats par période.
-- Migration auto-suffisante et idempotente.

ALTER TABLE public.daily_reports
  ADD COLUMN IF NOT EXISTS nb_appels        integer NOT NULL DEFAULT 0,  -- personnes appelées
  ADD COLUMN IF NOT EXISTS nb_rdv_confirmes integer NOT NULL DEFAULT 0,  -- rendez-vous confirmés
  ADD COLUMN IF NOT EXISTS nb_relances      integer NOT NULL DEFAULT 0,  -- relances
  ADD COLUMN IF NOT EXISTS nb_indisponibles integer NOT NULL DEFAULT 0,  -- contacts appelés indisponibles
  ADD COLUMN IF NOT EXISTS nb_rejets        integer NOT NULL DEFAULT 0,  -- rejets
  ADD COLUMN IF NOT EXISTS nb_autres        integer NOT NULL DEFAULT 0;  -- autres
