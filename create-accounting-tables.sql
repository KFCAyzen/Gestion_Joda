-- Table pour les budgets prévisionnels
CREATE TABLE IF NOT EXISTS budgets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    categorie TEXT NOT NULL,
    montant_prevu NUMERIC NOT NULL,
    periode TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Table pour les catégories personnalisées
CREATE TABLE IF NOT EXISTS custom_categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nom TEXT NOT NULL UNIQUE,
    type TEXT NOT NULL CHECK (type IN ('entree', 'sortie')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index pour améliorer les performances
CREATE INDEX IF NOT EXISTS idx_budgets_categorie ON budgets(categorie);
CREATE INDEX IF NOT EXISTS idx_budgets_periode ON budgets(periode);
CREATE INDEX IF NOT EXISTS idx_custom_categories_type ON custom_categories(type);

-- RLS Policies pour budgets
ALTER TABLE budgets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Agents et admins peuvent voir les budgets"
    ON budgets FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM users
            WHERE users.id = auth.uid()
            AND users.role IN ('agent', 'admin', 'super_admin')
        )
    );

CREATE POLICY "Admins peuvent créer des budgets"
    ON budgets FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM users
            WHERE users.id = auth.uid()
            AND users.role IN ('admin', 'super_admin')
        )
    );

CREATE POLICY "Admins peuvent supprimer des budgets"
    ON budgets FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM users
            WHERE users.id = auth.uid()
            AND users.role IN ('admin', 'super_admin')
        )
    );

-- RLS Policies pour custom_categories
ALTER TABLE custom_categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Agents et admins peuvent voir les catégories"
    ON custom_categories FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM users
            WHERE users.id = auth.uid()
            AND users.role IN ('agent', 'admin', 'super_admin')
        )
    );

CREATE POLICY "Admins peuvent créer des catégories"
    ON custom_categories FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM users
            WHERE users.id = auth.uid()
            AND users.role IN ('admin', 'super_admin')
        )
    );

CREATE POLICY "Admins peuvent supprimer des catégories"
    ON custom_categories FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM users
            WHERE users.id = auth.uid()
            AND users.role IN ('admin', 'super_admin')
        )
    );
