-- ================================================================
-- Paiements partiels (acomptes) : suivi du montant réglé par tranche
-- ================================================================
-- Jusqu'ici une tranche `payments` était binaire (attente -> paye) : aucun
-- moyen de représenter « ce qui a été réglé et ce qui reste » quand l'étudiant
-- verse un acompte. On ajoute deux colonnes :
--
--   montant_paye     : cumul réellement validé pour cette tranche (staff).
--   montant_declare  : montant déclaré par l'étudiant en attente de validation
--                      (segment « en validation » de la barre de progression).
--
-- Lifecycle :
--   déclaration (étudiant)  -> status=en_validation, montant_declare = acompte/total
--   validation (staff)      -> montant_paye += montant_declare ; montant_declare = 0
--                              status = (montant_paye >= montant) ? 'paye' : 'attente'
--   rejet (staff)           -> montant_declare = 0 ; status = 'retard'
--
-- Idempotent (ADD COLUMN IF NOT EXISTS). Aucune RLS touchée.
-- ================================================================

ALTER TABLE payments ADD COLUMN IF NOT EXISTS montant_paye    numeric NOT NULL DEFAULT 0;
ALTER TABLE payments ADD COLUMN IF NOT EXISTS montant_declare numeric NOT NULL DEFAULT 0;

-- Backfill : les tranches déjà payées sont réglées à 100 %.
UPDATE payments
   SET montant_paye = montant
 WHERE status = 'paye'
   AND montant_paye = 0;

-- Cohérence : pas de montant déclaré résiduel sur une tranche qui n'est plus
-- en cours de validation (ex. validée/rejetée avant cette migration).
UPDATE payments
   SET montant_declare = 0
 WHERE status <> 'en_validation'
   AND montant_declare <> 0;
