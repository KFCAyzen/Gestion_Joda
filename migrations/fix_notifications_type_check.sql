-- ================================================================
-- FIX : notifications_type_check trop restrictif (notifs perdues)
-- ================================================================
-- Découvert en testant le cycle de déclaration de paiement :
--   POST /api/declare-payment insère une notification staff de type
--   'paiement_en_attente' MAIS la contrainte CHECK `notifications_type_check`
--   ne l'autorise pas -> l'INSERT échoue (code 23514). La route n'inspecte
--   pas l'erreur de cet insert -> échec SILENCIEUX (l'API renvoie quand même
--   200). Résultat : le staff n'est jamais notifié in-app d'une déclaration.
--
-- Même problème pour 'paiement_rejete' (api/notify-payment-result) : la notif
-- envoyée à l'étudiant quand un paiement est REJETÉ est elle aussi bloquée.
--
-- Valeurs réellement insérées par le code (scan exhaustif des
-- `from('notifications').insert(...)`) :
--   mise_a_jour_dossier, paiement_valide, paiement_rejete,
--   paiement_en_attente, retard_paiement
-- (en base, seules 'mise_a_jour_dossier' et 'paiement_valide' existaient déjà
--  -> recréer la contrainte avec ce sur-ensemble valide sans casser l'existant.)
--
-- Idempotent : DROP IF EXISTS puis recréation.
-- ================================================================

ALTER TABLE notifications DROP CONSTRAINT IF EXISTS notifications_type_check;

ALTER TABLE notifications ADD CONSTRAINT notifications_type_check
  CHECK (type IN (
    'mise_a_jour_dossier',
    'paiement_valide',
    'paiement_rejete',
    'paiement_en_attente',
    'retard_paiement'
  ));
