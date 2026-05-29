-- Étend payment_config aux 5 types de service internationaux (frais en USD)
-- et seed les valeurs par défaut conformes à DEFAULT_PAYMENT_CONFIGS.

-- 1. Étendre la contrainte CHECK
ALTER TABLE public.payment_config
  DROP CONSTRAINT IF EXISTS payment_config_service_type_check;

ALTER TABLE public.payment_config
  ADD CONSTRAINT payment_config_service_type_check
  CHECK (service_type IN (
    'bourse_bachelor',
    'bourse_master',
    'bourse_bachelor_intl',
    'bourse_master_intl',
    'mandarin',
    'anglais',
    'language_program_intl',
    'partial_scholarship_intl',
    'full_scholarship_intl'
  ));

-- 2. Seed des configs intl (en USD). ON CONFLICT DO NOTHING : ne touche pas
--    aux configs déjà personnalisées par un admin via l'UI.
INSERT INTO public.payment_config (service_type, label, tranches, grace_days, daily_penalty, deadline_offset_days)
VALUES
  (
    'bourse_bachelor_intl',
    'Opening Fee — Bachelor',
    '[{"tranche": 1, "label": "Opening Fee", "montant": 150}]'::jsonb,
    3,
    5,
    30
  ),
  (
    'bourse_master_intl',
    'Opening Fee — Master',
    '[{"tranche": 1, "label": "Opening Fee", "montant": 150}]'::jsonb,
    3,
    5,
    30
  ),
  (
    'language_program_intl',
    'Language Program',
    '[{"tranche": 1, "label": "Language Program Fee", "montant": 749}]'::jsonb,
    7,
    10,
    30
  ),
  (
    'partial_scholarship_intl',
    'Partial Scholarship',
    '[{"tranche": 1, "label": "Partial Scholarship Fee", "montant": 1100}]'::jsonb,
    7,
    10,
    30
  ),
  (
    'full_scholarship_intl',
    'Full Scholarship',
    '[{"tranche": 1, "label": "Full Scholarship Fee", "montant": 1499}]'::jsonb,
    7,
    10,
    30
  )
ON CONFLICT (service_type) DO NOTHING;
