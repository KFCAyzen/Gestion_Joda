-- =============================================================================
-- ENTERPRISE-LEVEL RLS POLICIES FOR GESTION JODA
-- =============================================================================
-- Note: Functions are created in 'public' schema to avoid auth schema permissions
-- =============================================================================

-- =============================================================================
-- ÉTAPE 1: Créer les fonctions de sécurité dans le schéma public
-- =============================================================================

-- Fonction pour obtenir le rôle de l'utilisateur actuel
CREATE OR REPLACE FUNCTION public.user_role()
RETURNS TABLE (role TEXT)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY 
  SELECT u.role::TEXT
  FROM users u
  WHERE u.id = auth.uid();
END;
$$;

-- Fonction pour vérifier si l'utilisateur est admin
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM users u 
    WHERE u.id = auth.uid() 
    AND u.role IN ('admin', 'super_admin')
  );
END;
$$;

-- Fonction pour obtenir l'ID de l'étudiant lié à l'utilisateur
CREATE OR REPLACE FUNCTION public.get_student_id()
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN (
    SELECT s.id FROM students s 
    WHERE s.created_by = auth.uid() 
    LIMIT 1
  );
END;
$$;

-- Fonction pour vérifier si l'utilisateur est agent
CREATE OR REPLACE FUNCTION public.is_agent()
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM users u 
    WHERE u.id = auth.uid() 
    AND u.role IN ('agent', 'admin', 'supervisor', 'super_admin')
  );
END;
$$;

-- =============================================================================
-- ÉTAPE 2: Table d'audit pour tracer les accès
-- =============================================================================

CREATE TABLE IF NOT EXISTS audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID,
  action TEXT NOT NULL,
  table_name TEXT NOT NULL,
  record_id UUID,
  old_values JSONB,
  new_values JSONB,
  ip_address INET,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Fonction pour logger les actions
CREATE OR REPLACE FUNCTION public.log_action(
  p_action TEXT,
  p_table_name TEXT,
  p_record_id UUID DEFAULT NULL,
  p_old_values JSONB DEFAULT NULL,
  p_new_values JSONB DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO audit_log (user_id, action, table_name, record_id, old_values, new_values)
  VALUES (auth.uid(), p_action, p_table_name, p_record_id, p_old_values, p_new_values);
END;
$$;

-- =============================================================================
-- ÉTAPE 3: POLITIQUES RLS - TABLE USERS
-- =============================================================================

DROP POLICY IF EXISTS "users_read_own" ON users;
DROP POLICY IF EXISTS "users_read_all" ON users;
DROP POLICY IF EXISTS "users_insert_service" ON users;
DROP POLICY IF EXISTS "users_update_own" ON users;
DROP POLICY IF EXISTS "users_update_admin" ON users;
DROP POLICY IF EXISTS "users_delete_admin" ON users;

-- Lecture: soi-même ou admin
CREATE POLICY "users_read_own" ON users FOR SELECT USING (id = auth.uid());
CREATE POLICY "users_read_all" ON users FOR SELECT USING (public.is_admin());

-- Insert: service_role uniquement
CREATE POLICY "users_insert_service" ON users FOR INSERT WITH CHECK (auth.role() = 'service_role');

-- Update: soi-même
CREATE POLICY "users_update_own" ON users FOR UPDATE USING (id = auth.uid());
CREATE POLICY "users_update_admin" ON users FOR UPDATE USING (public.is_admin() AND (SELECT role FROM users WHERE id = auth.uid()) = 'super_admin');

-- Delete: super_admin uniquement
CREATE POLICY "users_delete_admin" ON users FOR DELETE USING (public.is_admin() AND (SELECT role FROM users WHERE id = auth.uid()) = 'super_admin');

-- =============================================================================
-- ÉTAPE 4: POLITIQUES RLS - TABLE STUDENTS
-- =============================================================================

DROP POLICY IF EXISTS "students_read_own" ON students;
DROP POLICY IF EXISTS "students_read_agent" ON students;
DROP POLICY IF EXISTS "students_insert_agent" ON students;
DROP POLICY IF EXISTS "students_update_agent" ON students;
DROP POLICY IF EXISTS "students_delete_admin" ON students;

CREATE POLICY "students_read_own" ON students FOR SELECT USING (created_by = auth.uid());
CREATE POLICY "students_read_agent" ON students FOR SELECT USING (public.is_agent());
CREATE POLICY "students_insert_agent" ON students FOR INSERT WITH CHECK (public.is_agent());
CREATE POLICY "students_update_agent" ON students FOR UPDATE USING (public.is_agent());
CREATE POLICY "students_delete_admin" ON students FOR DELETE USING (public.is_admin());

-- =============================================================================
-- ÉTAPE 5: POLITIQUES RLS - TABLE UNIVERSITIES
-- =============================================================================

DROP POLICY IF EXISTS "universities_read_public" ON universities;
DROP POLICY IF EXISTS "universities_manage_admin" ON universities;

CREATE POLICY "universities_read_public" ON universities FOR SELECT USING (active = true);
CREATE POLICY "universities_manage_admin" ON universities FOR ALL USING (public.is_admin());

-- =============================================================================
-- ÉTAPE 6: POLITIQUES RLS - TABLE DOCUMENTS
-- =============================================================================

DROP POLICY IF EXISTS "documents_read_own" ON documents;
DROP POLICY IF EXISTS "documents_read_agent" ON documents;
DROP POLICY IF EXISTS "documents_insert_user" ON documents;
DROP POLICY IF EXISTS "documents_update_agent" ON documents;
DROP POLICY IF EXISTS "documents_delete_admin" ON documents;

CREATE POLICY "documents_read_own" ON documents FOR SELECT USING (student_id = public.get_student_id());
CREATE POLICY "documents_read_agent" ON documents FOR SELECT USING (public.is_agent());
CREATE POLICY "documents_insert_user" ON documents FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "documents_update_agent" ON documents FOR UPDATE USING (public.is_agent());
CREATE POLICY "documents_delete_admin" ON documents FOR DELETE USING (public.is_admin());

-- =============================================================================
-- ÉTAPE 7: POLITIQUES RLS - TABLE DOSSIER_BOURSES
-- =============================================================================

DROP POLICY IF EXISTS "dossiers_read_agent" ON dossier_bourses;
DROP POLICY IF EXISTS "dossiers_manage_agent" ON dossier_bourses;
DROP POLICY IF EXISTS "dossiers_delete_admin" ON dossier_bourses;

CREATE POLICY "dossiers_read_agent" ON dossier_bourses FOR SELECT USING (public.is_agent());
CREATE POLICY "dossiers_insert_agent" ON dossier_bourses FOR INSERT WITH CHECK (public.is_agent());
CREATE POLICY "dossiers_update_agent" ON dossier_bourses FOR UPDATE USING (public.is_agent());
CREATE POLICY "dossiers_delete_admin" ON dossier_bourses FOR DELETE USING (public.is_admin());

-- =============================================================================
-- ÉTAPE 8: POLITIQUES RLS - TABLE DOSSIER_HISTORY
-- =============================================================================

DROP POLICY IF EXISTS "history_read_agent" ON dossier_history;
DROP POLICY IF EXISTS "history_insert_agent" ON dossier_history;
DROP POLICY IF EXISTS "history_delete_admin" ON dossier_history;

CREATE POLICY "history_read_agent" ON dossier_history FOR SELECT USING (public.is_agent());
CREATE POLICY "history_insert_agent" ON dossier_history FOR INSERT WITH CHECK (public.is_agent());
CREATE POLICY "history_delete_admin" ON dossier_history FOR DELETE USING (public.is_admin());

-- =============================================================================
-- ÉTAPE 9: POLITIQUES RLS - TABLE PAYMENTS
-- =============================================================================

DROP POLICY IF EXISTS "payments_read_own" ON payments;
DROP POLICY IF EXISTS "payments_read_agent" ON payments;
DROP POLICY IF EXISTS "payments_insert_user" ON payments;
DROP POLICY IF EXISTS "payments_update_agent" ON payments;
DROP POLICY IF EXISTS "payments_delete_admin" ON payments;

CREATE POLICY "payments_read_own" ON payments FOR SELECT USING (student_id = public.get_student_id());
CREATE POLICY "payments_read_agent" ON payments FOR SELECT USING (public.is_agent());
CREATE POLICY "payments_insert_user" ON payments FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "payments_update_agent" ON payments FOR UPDATE USING (public.is_agent());
CREATE POLICY "payments_delete_admin" ON payments FOR DELETE USING (public.is_admin());

-- =============================================================================
-- ÉTAPE 10: POLITIQUES RLS - TABLE COURS_LANGUES
-- =============================================================================

DROP POLICY IF EXISTS "cours_read_all" ON cours_langues;
DROP POLICY IF EXISTS "cours_manage_agent" ON cours_langues;

CREATE POLICY "cours_read_all" ON cours_langues FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "cours_manage_agent" ON cours_langues FOR ALL USING (public.is_agent());

-- =============================================================================
-- ÉTAPE 11: POLITIQUES RLS - TABLE COMPTABILITÉ (ENTRÉES)
-- =============================================================================

DROP POLICY IF EXISTS "entrees_read_admin" ON entrees_comptables;
DROP POLICY IF EXISTS "entrees_manage_admin" ON entrees_comptables;

CREATE POLICY "entrees_read_admin" ON entrees_comptables FOR SELECT USING (public.is_admin());
CREATE POLICY "entrees_insert_admin" ON entrees_comptables FOR INSERT WITH CHECK (public.is_admin());
CREATE POLICY "entrees_update_admin" ON entrees_comptables FOR UPDATE USING (public.is_admin());
CREATE POLICY "entrees_delete_admin" ON entrees_comptables FOR DELETE USING (public.is_admin());

-- =============================================================================
-- ÉTAPE 12: POLITIQUES RLS - TABLE COMPTABILITÉ (SORTIES)
-- =============================================================================

DROP POLICY IF EXISTS "sorties_read_admin" ON sorties_comptables;
DROP POLICY IF EXISTS "sorties_manage_admin" ON sorties_comptables;

CREATE POLICY "sorties_read_admin" ON sorties_comptables FOR SELECT USING (public.is_admin());
CREATE POLICY "sorties_insert_admin" ON sorties_comptables FOR INSERT WITH CHECK (public.is_admin());
CREATE POLICY "sorties_update_admin" ON sorties_comptables FOR UPDATE USING (public.is_admin());
CREATE POLICY "sorties_delete_admin" ON sorties_comptables FOR DELETE USING (public.is_admin());

-- =============================================================================
-- ÉTAPE 13: POLITIQUES RLS - TABLE NOTIFICATIONS
-- =============================================================================

DROP POLICY IF EXISTS "notifications_read_own" ON notifications;
DROP POLICY IF EXISTS "notifications_read_admin" ON notifications;
DROP POLICY IF EXISTS "notifications_insert_agent" ON notifications;
DROP POLICY IF EXISTS "notifications_update_own" ON notifications;
DROP POLICY IF EXISTS "notifications_delete_own" ON notifications;

CREATE POLICY "notifications_read_own" ON notifications FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "notifications_read_admin" ON notifications FOR SELECT USING (public.is_admin());
CREATE POLICY "notifications_insert_agent" ON notifications FOR INSERT WITH CHECK (public.is_agent());
CREATE POLICY "notifications_update_own" ON notifications FOR UPDATE USING (user_id = auth.uid() OR public.is_admin());
CREATE POLICY "notifications_delete_own" ON notifications FOR DELETE USING (user_id = auth.uid() OR public.is_admin());

-- =============================================================================
-- ÉTAPE 14: POLITIQUES RLS - TABLE MESSAGES
-- =============================================================================

DROP POLICY IF EXISTS "messages_read_parties" ON messages;
DROP POLICY IF EXISTS "messages_read_admin" ON messages;
DROP POLICY IF EXISTS "messages_insert_user" ON messages;
DROP POLICY IF EXISTS "messages_delete_own" ON messages;

CREATE POLICY "messages_read_parties" ON messages FOR SELECT USING (from_user_id = auth.uid() OR to_user_id = auth.uid());
CREATE POLICY "messages_read_admin" ON messages FOR SELECT USING (public.is_admin());
CREATE POLICY "messages_insert_user" ON messages FOR INSERT WITH CHECK (from_user_id = auth.uid());
CREATE POLICY "messages_delete_own" ON messages FOR DELETE USING (from_user_id = auth.uid() OR public.is_admin());

-- =============================================================================
-- ÉTAPE 15: POLITIQUES RLS - TABLE AUDIT_LOG (lecture admin uniquement)
-- =============================================================================

DROP POLICY IF EXISTS "audit_read_admin" ON audit_log;
DROP POLICY IF EXISTS "audit_insert_trigger" ON audit_log;

CREATE POLICY "audit_read_admin" ON audit_log FOR SELECT USING (public.is_admin());
CREATE POLICY "audit_insert_trigger" ON audit_log FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- =============================================================================
-- ÉTAPE 16: ACTIVATION RLS SUR TOUTES LES TABLES
-- =============================================================================

ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE students ENABLE ROW LEVEL SECURITY;
ALTER TABLE universities ENABLE ROW LEVEL SECURITY;
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE dossier_bourses ENABLE ROW LEVEL SECURITY;
ALTER TABLE dossier_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE cours_langues ENABLE ROW LEVEL SECURITY;
ALTER TABLE entrees_comptables ENABLE ROW LEVEL SECURITY;
ALTER TABLE sorties_comptables ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;

-- =============================================================================
-- ÉTAPE 17: CRÉER UN TRIGGER POUR L'AUDIT AUTOMATIQUE
-- =============================================================================

CREATE OR REPLACE FUNCTION public.trigger_audit()
RETURNS TRIGGER AS $$
BEGIN
  PERFORM public.log_action(
    TG_OP,
    TG_TABLE_NAME,
    NEW.id,
    to_jsonb(OLD),
    to_jsonb(NEW)
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS audit_users_trigger ON users;
CREATE TRIGGER audit_users_trigger AFTER UPDATE ON users FOR EACH ROW EXECUTE FUNCTION public.trigger_audit();

DROP TRIGGER IF EXISTS audit_students_trigger ON students;
CREATE TRIGGER audit_students_trigger AFTER INSERT OR UPDATE OR DELETE ON students FOR EACH ROW EXECUTE FUNCTION public.trigger_audit();

DROP TRIGGER IF EXISTS audit_payments_trigger ON payments;
CREATE TRIGGER audit_payments_trigger AFTER INSERT OR UPDATE OR DELETE ON payments FOR EACH ROW EXECUTE FUNCTION public.trigger_audit();

DROP TRIGGER IF EXISTS audit_dossiers_trigger ON dossier_bourses;
CREATE TRIGGER audit_dossiers_trigger AFTER INSERT OR UPDATE OR DELETE ON dossier_bourses FOR EACH ROW EXECUTE FUNCTION public.trigger_audit();