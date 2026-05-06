-- Table pour les logs d'activités
CREATE TABLE IF NOT EXISTS activity_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    user_name TEXT NOT NULL,
    user_role TEXT NOT NULL,
    activity_type TEXT NOT NULL,
    entity_type TEXT NOT NULL,
    entity_id TEXT,
    description TEXT NOT NULL,
    metadata JSONB DEFAULT '{}'::jsonb,
    ip_address TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index pour améliorer les performances des requêtes
CREATE INDEX IF NOT EXISTS idx_activity_logs_user_id ON activity_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_activity_logs_user_role ON activity_logs(user_role);
CREATE INDEX IF NOT EXISTS idx_activity_logs_activity_type ON activity_logs(activity_type);
CREATE INDEX IF NOT EXISTS idx_activity_logs_entity_type ON activity_logs(entity_type);
CREATE INDEX IF NOT EXISTS idx_activity_logs_created_at ON activity_logs(created_at DESC);

-- RLS policies pour activity_logs
ALTER TABLE activity_logs ENABLE ROW LEVEL SECURITY;

-- Les admins et super_admins peuvent tout voir
CREATE POLICY "Admins can view all activity logs"
    ON activity_logs FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM users
            WHERE users.id = auth.uid()
            AND users.role IN ('admin', 'super_admin')
        )
    );

-- Les agents peuvent voir leurs propres logs
CREATE POLICY "Agents can view their own activity logs"
    ON activity_logs FOR SELECT
    USING (
        user_id = auth.uid()
        OR EXISTS (
            SELECT 1 FROM users
            WHERE users.id = auth.uid()
            AND users.role IN ('admin', 'super_admin')
        )
    );

-- Tout le monde peut insérer des logs (pour tracer les activités)
CREATE POLICY "Anyone can insert activity logs"
    ON activity_logs FOR INSERT
    WITH CHECK (true);

-- Commentaires
COMMENT ON TABLE activity_logs IS 'Logs des activités sensibles effectuées dans l''application';
COMMENT ON COLUMN activity_logs.user_id IS 'ID de l''utilisateur qui a effectué l''action';
COMMENT ON COLUMN activity_logs.user_name IS 'Nom de l''utilisateur';
COMMENT ON COLUMN activity_logs.user_role IS 'Rôle de l''utilisateur (admin, agent, etc.)';
COMMENT ON COLUMN activity_logs.activity_type IS 'Type d''activité (student_create, application_update, etc.)';
COMMENT ON COLUMN activity_logs.entity_type IS 'Type d''entité concernée (student, application, etc.)';
COMMENT ON COLUMN activity_logs.entity_id IS 'ID de l''entité concernée';
COMMENT ON COLUMN activity_logs.description IS 'Description de l''action effectuée';
COMMENT ON COLUMN activity_logs.metadata IS 'Données supplémentaires en JSON (anciennes valeurs, nouvelles valeurs, etc.)';
