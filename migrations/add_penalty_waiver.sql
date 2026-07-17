-- Annulation (waiver) des pénalités de retard d'un paiement.
--
-- Objectif : permettre au staff d'annuler définitivement la pénalité d'une
-- tranche. Sans drapeau persistant, la pénalité serait recalculée et réappliquée
-- au chargement suivant (client syncPenalties) ou par le cron check-late-payments.
--
-- Règle : quand penalites_annulee = true, la pénalité vaut 0 partout et n'est
-- plus jamais recalculée (le principal reste dû ; seule la pénalité est levée).
--
-- Idempotent : réexécutable sans effet de bord.

ALTER TABLE public.payments
  ADD COLUMN IF NOT EXISTS penalites_annulee boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN public.payments.penalites_annulee IS
  'Pénalité de retard annulée par le staff : force penalites=0 et bloque tout recalcul (client + cron).';
