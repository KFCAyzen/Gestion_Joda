-- Table de configuration des frais
CREATE TABLE IF NOT EXISTS payment_config (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  service_type text NOT NULL UNIQUE
    CHECK (service_type IN ('bourse_bachelor', 'bourse_master', 'mandarin', 'anglais')),
  label text NOT NULL,
  tranches jsonb NOT NULL DEFAULT '[]'::jsonb,
  grace_days integer NOT NULL DEFAULT 15,
  daily_penalty integer NOT NULL DEFAULT 1000,
  deadline_offset_days integer NOT NULL DEFAULT 30,
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid REFERENCES users(id)
);

-- RLS
ALTER TABLE payment_config ENABLE ROW LEVEL SECURITY;

-- Lecture pour tous les utilisateurs authentifiés
CREATE POLICY "payment_config_select" ON payment_config
  FOR SELECT TO authenticated USING (true);

-- Modification réservée aux admins
CREATE POLICY "payment_config_update" ON payment_config
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
        AND users.role IN ('admin', 'super_admin')
    )
  );

CREATE POLICY "payment_config_insert" ON payment_config
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
        AND users.role IN ('admin', 'super_admin')
    )
  );

-- Valeurs par défaut
INSERT INTO payment_config (service_type, label, tranches, grace_days, daily_penalty, deadline_offset_days)
VALUES
  (
    'bourse_bachelor',
    'Procédure Bourse — Bachelor',
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
    'bourse_master',
    'Procédure Bourse — Master',
    '[
      {"tranche": 1, "label": "Ouverture de dossier", "montant": 150000},
      {"tranche": 2, "label": "Caution", "montant": 500000},
      {"tranche": 3, "label": "Visa", "montant": 1300000}
    ]'::jsonb,
    3,
    10000,
    30
  ),
  (
    'mandarin',
    'Cours de Mandarin',
    '[
      {"tranche": 1, "label": "Inscription", "montant": 30000},
      {"tranche": 2, "label": "Livre", "montant": 20000},
      {"tranche": 3, "label": "1re tranche", "montant": 70000},
      {"tranche": 4, "label": "2e tranche", "montant": 30000}
    ]'::jsonb,
    15,
    1000,
    15
  ),
  (
    'anglais',
    'Cours d''Anglais',
    '[
      {"tranche": 1, "label": "Inscription", "montant": 10000},
      {"tranche": 2, "label": "Livre", "montant": 11000},
      {"tranche": 3, "label": "1re tranche", "montant": 30000},
      {"tranche": 4, "label": "2e tranche", "montant": 40000}
    ]'::jsonb,
    15,
    1000,
    15
  )
ON CONFLICT (service_type) DO NOTHING;
