-- Migration: cours_langues + workflow validation paiements
-- À exécuter dans Supabase Dashboard > SQL Editor

-- ============================================================
-- 1. TABLE cours_langues
-- ============================================================
-- Crée la table si elle n'existe pas encore (idempotent)
CREATE TABLE IF NOT EXISTS cours_langues (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id  UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    langue      TEXT NOT NULL CHECK (langue IN ('mandarin', 'anglais')),
    statut      TEXT NOT NULL DEFAULT 'actif'
                    CHECK (statut IN ('actif', 'termine', 'abandonne')),
    inscrit_le  DATE DEFAULT CURRENT_DATE,
    created_at  TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at  TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index pour les recherches par étudiant
CREATE INDEX IF NOT EXISTS idx_cours_langues_student_id ON cours_langues(student_id);

-- Trigger updated_at
CREATE OR REPLACE FUNCTION update_cours_langues_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_cours_langues_updated_at ON cours_langues;
CREATE TRIGGER trg_cours_langues_updated_at
    BEFORE UPDATE ON cours_langues
    FOR EACH ROW EXECUTE FUNCTION update_cours_langues_updated_at();

-- ============================================================
-- 2. RLS cours_langues
-- ============================================================
ALTER TABLE cours_langues ENABLE ROW LEVEL SECURITY;

-- Staff (agent / supervisor / admin) : lecture + écriture
DROP POLICY IF EXISTS "staff_all_cours_langues" ON cours_langues;
CREATE POLICY "staff_all_cours_langues" ON cours_langues
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM users
            WHERE users.id = auth.uid()
            AND users.role IN ('agent', 'supervisor', 'admin', 'super_admin')
        )
    );

-- Étudiant : lecture de ses propres cours seulement
DROP POLICY IF EXISTS "student_read_own_cours_langues" ON cours_langues;
CREATE POLICY "student_read_own_cours_langues" ON cours_langues
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM students
            WHERE students.id = cours_langues.student_id
            AND students.created_by = auth.uid()
        )
    );

-- ============================================================
-- 3. STATUT en_validation dans payments
-- ============================================================
-- Si la colonne status a une contrainte CHECK, on la supprime
-- et on la recrée avec la nouvelle valeur.
-- Sans contrainte CHECK, ces commandes ne font rien de cassant.

DO $$
DECLARE
    v_constraint TEXT;
BEGIN
    -- Chercher une éventuelle contrainte CHECK sur payments.status
    SELECT conname INTO v_constraint
    FROM pg_constraint
    WHERE conrelid = 'payments'::regclass
      AND contype = 'c'
      AND pg_get_constraintdef(oid) LIKE '%status%';

    IF v_constraint IS NOT NULL THEN
        EXECUTE 'ALTER TABLE payments DROP CONSTRAINT ' || quote_ident(v_constraint);
        ALTER TABLE payments
            ADD CONSTRAINT payments_status_check
            CHECK (status IN ('attente', 'paye', 'retard', 'en_validation'));
        RAISE NOTICE 'Contrainte payments_status_check mise à jour.';
    ELSE
        RAISE NOTICE 'Pas de contrainte CHECK sur payments.status — rien à modifier.';
    END IF;
END $$;

-- ============================================================
-- 4. COLONNES manquantes dans dossier_bourses (si absentes)
-- ============================================================
-- Ces colonnes sont utilisées pour l'auto-création du dossier à l'inscription
ALTER TABLE dossier_bourses
    ADD COLUMN IF NOT EXISTS desired_program TEXT DEFAULT '',
    ADD COLUMN IF NOT EXISTS study_level     TEXT DEFAULT '',
    ADD COLUMN IF NOT EXISTS notes_internes  TEXT DEFAULT '';

-- ============================================================
-- 5. VÉRIFICATION
-- ============================================================
SELECT
    'cours_langues' AS table_name,
    COUNT(*) AS rows
FROM cours_langues
UNION ALL
SELECT 'payments', COUNT(*) FROM payments
UNION ALL
SELECT 'dossier_bourses', COUNT(*) FROM dossier_bourses;
