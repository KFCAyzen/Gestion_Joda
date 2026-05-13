-- Migration : ajout du champ nationalite sur la table students
-- et ajout des configs de frais pour les étudiants internationaux

-- 1. Colonne nationalite (nullable, texte libre)
ALTER TABLE students
    ADD COLUMN IF NOT EXISTS nationalite TEXT DEFAULT NULL;

-- 2. Étendre la contrainte CHECK sur service_type pour inclure les variantes _intl
ALTER TABLE payment_config
    DROP CONSTRAINT IF EXISTS payment_config_service_type_check;

ALTER TABLE payment_config
    ADD CONSTRAINT payment_config_service_type_check
    CHECK (service_type IN (
        'bourse_bachelor', 'bourse_master',
        'bourse_bachelor_intl', 'bourse_master_intl',
        'mandarin', 'anglais'
    ));

-- 3. Configs de paiement pour les procédures bourse internationales
-- (seront configurables via l'interface FeeConfigManagement)
INSERT INTO payment_config (service_type, label, tranches, grace_days, daily_penalty, deadline_offset_days)
VALUES
    (
        'bourse_bachelor_intl',
        'Procédure Bourse — Bachelor (International)',
        '[
            {"tranche": 1, "label": "Ouverture de dossier", "montant": 150000},
            {"tranche": 2, "label": "Caution", "montant": 500000},
            {"tranche": 3, "label": "Visa", "montant": 1000000}
        ]'::jsonb,
        3,
        10000,
        30
    ),
    (
        'bourse_master_intl',
        'Procédure Bourse — Master (International)',
        '[
            {"tranche": 1, "label": "Ouverture de dossier", "montant": 150000},
            {"tranche": 2, "label": "Caution", "montant": 500000},
            {"tranche": 3, "label": "Visa", "montant": 1300000}
        ]'::jsonb,
        3,
        10000,
        30
    )
ON CONFLICT (service_type) DO NOTHING;
