-- Module RH — Ajoute un statut de validation aux rapports journaliers.
-- Utilisé par l'app mobile Agent (validation / signalement des rapports
-- de l'équipe) et alignable côté web (PublicReportPage / HRManagement).
--
-- Idempotent : peut être relancé sans risque.
-- Valeurs : 'soumis' (par défaut), 'valide', 'signale'.

ALTER TABLE public.daily_reports
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'soumis';

-- Contrainte de domaine (drop/recreate pour rester idempotent).
ALTER TABLE public.daily_reports
  DROP CONSTRAINT IF EXISTS daily_reports_status_check;
ALTER TABLE public.daily_reports
  ADD CONSTRAINT daily_reports_status_check
  CHECK (status IN ('soumis', 'valide', 'signale'));

CREATE INDEX IF NOT EXISTS idx_daily_reports_status ON public.daily_reports(status);
