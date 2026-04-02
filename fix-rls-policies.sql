-- Script pour corriger les politiques RLS et disable RLS pour le seed
-- Exécuter ce script dans le SQL Editor de Supabase

-- 1. Supprimer les politiques problématiques
DROP POLICY IF EXISTS "users_access_policy" ON users;
DROP POLICY IF EXISTS "students_access_policy" ON students;
DROP POLICY IF EXISTS "documents_access_policy" ON documents;
DROP POLICY IF EXISTS "dossier_bourses_access_policy" ON dossier_bourses;
DROP POLICY IF EXISTS "payments_access_policy" ON payments;
DROP POLICY IF EXISTS "notifications_access_policy" ON notifications;
DROP POLICY IF EXISTS "comptabilite_access_policy" ON entrees_comptables;
DROP POLICY IF EXISTS "comptabilite_sorties_access_policy" ON sorties_comptables;

-- 2. Créer des politiques plus simples (sans récursion)
-- Pour users : permettre tout accès en lecture/écriture
CREATE POLICY "allow_all_users" ON users FOR ALL USING (true) WITH CHECK (true);

-- Pour students : permettre tout accès
CREATE POLICY "allow_all_students" ON students FOR ALL USING (true) WITH CHECK (true);

-- Pour universities : permettre tout accès
CREATE POLICY "allow_all_universities" ON universities FOR ALL USING (true) WITH CHECK (true);

-- Pour documents : permettre tout accès
CREATE POLICY "allow_all_documents" ON documents FOR ALL USING (true) WITH CHECK (true);

-- Pour dossier_bourses : permettre tout accès
CREATE POLICY "allow_all_dossiers" ON dossier_bourses FOR ALL USING (true) WITH CHECK (true);

-- Pour dossier_history : permettre tout accès
CREATE POLICY "allow_all_history" ON dossier_history FOR ALL USING (true) WITH CHECK (true);

-- Pour payments : permettre tout accès
CREATE POLICY "allow_all_payments" ON payments FOR ALL USING (true) WITH CHECK (true);

-- Pour cours_langues : permettre tout accès
CREATE POLICY "allow_all_cours" ON cours_langues FOR ALL USING (true) WITH CHECK (true);

-- Pour notifications : permettre tout accès
CREATE POLICY "allow_all_notifications" ON notifications FOR ALL USING (true) WITH CHECK (true);

-- Pour entrees_comptables : permettre tout accès
CREATE POLICY "allow_all_entrees" ON entrees_comptables FOR ALL USING (true) WITH CHECK (true);

-- Pour sorties_comptables : permettre tout accès
CREATE POLICY "allow_all_sorties" ON sorties_comptables FOR ALL USING (true) WITH CHECK (true);

-- Pour messages : permettre tout accès
CREATE POLICY "allow_all_messages" ON messages FOR ALL USING (true) WITH CHECK (true);

console.log("✅ Politiques RLS corrigées!");