-- ================================================================
-- FIX: RLS sur la table documents
-- À exécuter dans Supabase SQL Editor
-- ================================================================

-- Supprimer les policies existantes (si elles existent)
DROP POLICY IF EXISTS "documents_student_own"   ON public.documents;
DROP POLICY IF EXISTS "documents_staff_all"     ON public.documents;
DROP POLICY IF EXISTS "documents_staff_select"  ON public.documents;
DROP POLICY IF EXISTS "documents_staff_write"   ON public.documents;

-- Activer RLS
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;

-- Étudiants : lecture + écriture sur leurs propres documents (via students.created_by)
CREATE POLICY "documents_student_own" ON public.documents
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.students s
      WHERE s.id = documents.student_id
        AND s.created_by = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.students s
      WHERE s.id = documents.student_id
        AND s.created_by = auth.uid()
    )
  );

-- Staff (agent, supervisor, admin, super_admin) : accès complet à tous les documents
CREATE POLICY "documents_staff_all" ON public.documents
  FOR ALL
  USING (
    (SELECT role FROM public.users WHERE id = auth.uid())
      IN ('agent', 'supervisor', 'admin', 'super_admin')
  )
  WITH CHECK (
    (SELECT role FROM public.users WHERE id = auth.uid())
      IN ('agent', 'supervisor', 'admin', 'super_admin')
  );

-- Vérification
SELECT policyname, cmd, qual
FROM pg_policies
WHERE schemaname = 'public' AND tablename = 'documents'
ORDER BY policyname;
