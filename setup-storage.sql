-- Créer le bucket pour les documents étudiants
INSERT INTO storage.buckets (id, name, public)
VALUES ('student-documents', 'student-documents', true)
ON CONFLICT (id) DO NOTHING;

-- Politique : les étudiants peuvent uploader leurs propres documents
CREATE POLICY "students_upload_own_docs" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'student-documents'
    AND auth.uid() IS NOT NULL
  );

-- Politique : lecture publique (pour afficher les docs)
CREATE POLICY "public_read_docs" ON storage.objects
  FOR SELECT USING (bucket_id = 'student-documents');

-- Politique : les étudiants peuvent remplacer leurs docs
CREATE POLICY "students_update_own_docs" ON storage.objects
  FOR UPDATE USING (
    bucket_id = 'student-documents'
    AND auth.uid() IS NOT NULL
  );

-- Mettre à jour les dossiers existants en document_manquant (en attente de documents)
UPDATE dossier_bourses SET status = 'document_manquant'
WHERE status = 'document_recu'
AND student_id NOT IN (
  SELECT DISTINCT student_id FROM documents
);

-- Corriger la contrainte documents pour accepter les nouveaux types
ALTER TABLE documents DROP CONSTRAINT IF EXISTS documents_type_check;
ALTER TABLE documents ADD CONSTRAINT documents_type_check
  CHECK (type IN (
    'passeport', 'casier_judiciaire', 'carte_photo',
    'releve_bac', 'diplome_bac', 'lettre_motivation',
    'lettre_recommandation', 'certificat_hsk'
  ));

SELECT id, student_id, status FROM dossier_bourses;
