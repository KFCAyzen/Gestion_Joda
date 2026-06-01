-- Module RH — Enrichissement du profil employé
-- Ajoute : état civil + identité, adresse + contact d'urgence, contrat & emploi
-- Idempotent (IF NOT EXISTS sur chaque colonne).

-- ── État civil & identité ───────────────────────────────────────────────────
ALTER TABLE employees ADD COLUMN IF NOT EXISTS date_naissance        date;
ALTER TABLE employees ADD COLUMN IF NOT EXISTS lieu_naissance        text;
ALTER TABLE employees ADD COLUMN IF NOT EXISTS sexe                  text
  CHECK (sexe IS NULL OR sexe IN ('M','F','autre'));
ALTER TABLE employees ADD COLUMN IF NOT EXISTS nationalite           text;
ALTER TABLE employees ADD COLUMN IF NOT EXISTS situation_matrimoniale text
  CHECK (situation_matrimoniale IS NULL OR situation_matrimoniale IN ('celibataire','marie','divorce','veuf','union_libre'));
ALTER TABLE employees ADD COLUMN IF NOT EXISTS nombre_enfants        integer DEFAULT 0 CHECK (nombre_enfants >= 0);
ALTER TABLE employees ADD COLUMN IF NOT EXISTS type_piece            text
  CHECK (type_piece IS NULL OR type_piece IN ('cni','passeport','permis','recepisse','autre'));
ALTER TABLE employees ADD COLUMN IF NOT EXISTS numero_piece          text;
ALTER TABLE employees ADD COLUMN IF NOT EXISTS date_expiration_piece date;
ALTER TABLE employees ADD COLUMN IF NOT EXISTS lieu_emission_piece   text;

-- ── Adresse ─────────────────────────────────────────────────────────────────
ALTER TABLE employees ADD COLUMN IF NOT EXISTS adresse               text;
ALTER TABLE employees ADD COLUMN IF NOT EXISTS quartier              text;
ALTER TABLE employees ADD COLUMN IF NOT EXISTS ville                 text;
ALTER TABLE employees ADD COLUMN IF NOT EXISTS pays                  text;

-- ── Contact d'urgence ───────────────────────────────────────────────────────
ALTER TABLE employees ADD COLUMN IF NOT EXISTS urgence_nom           text;
ALTER TABLE employees ADD COLUMN IF NOT EXISTS urgence_lien          text;
ALTER TABLE employees ADD COLUMN IF NOT EXISTS urgence_telephone     text;
ALTER TABLE employees ADD COLUMN IF NOT EXISTS urgence_email         text;

-- ── Contrat & emploi ────────────────────────────────────────────────────────
ALTER TABLE employees ADD COLUMN IF NOT EXISTS type_contrat          text
  CHECK (type_contrat IS NULL OR type_contrat IN ('cdi','cdd','stage','consultant','interim','temps_partiel'));
ALTER TABLE employees ADD COLUMN IF NOT EXISTS date_fin_contrat      date;
ALTER TABLE employees ADD COLUMN IF NOT EXISTS periode_essai_mois    integer CHECK (periode_essai_mois IS NULL OR periode_essai_mois >= 0);
ALTER TABLE employees ADD COLUMN IF NOT EXISTS superieur_id          uuid REFERENCES employees(id) ON DELETE SET NULL;
ALTER TABLE employees ADD COLUMN IF NOT EXISTS type_horaire          text
  CHECK (type_horaire IS NULL OR type_horaire IN ('temps_plein','temps_partiel','flexible','poste'));

-- ── Index utiles ────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_employees_superieur ON employees(superieur_id);
CREATE INDEX IF NOT EXISTS idx_employees_type_contrat ON employees(type_contrat);

-- Note : RLS déjà active sur employees, héritée pour les nouvelles colonnes.
