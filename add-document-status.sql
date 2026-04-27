-- 1. Ajouter le statut en_attente_documents dans la contrainte CHECK
ALTER TABLE dossier_bourses DROP CONSTRAINT IF EXISTS dossier_bourses_status_check;
ALTER TABLE dossier_bourses ADD CONSTRAINT dossier_bourses_status_check
  CHECK (status IN (
    'en_attente_documents',
    'document_recu',
    'en_attente',
    'en_cours',
    'document_manquant',
    'admission_validee',
    'admission_rejetee',
    'en_attente_universite',
    'visa_en_cours',
    'termine'
  ));

-- 2. Mettre à jour les dossiers existants sans documents vers le nouveau statut
UPDATE dossier_bourses SET status = 'en_attente_documents'
WHERE status = 'document_recu'
AND id NOT IN (
  SELECT DISTINCT d.id FROM dossier_bourses d
  INNER JOIN documents doc ON doc.student_id = d.student_id
);

-- 3. Ajouter les types de documents manquants dans la contrainte
ALTER TABLE documents DROP CONSTRAINT IF EXISTS documents_type_check;
ALTER TABLE documents ADD CONSTRAINT documents_type_check
  CHECK (type IN (
    'passeport',
    'casier_judiciaire',
    'carte_photo',
    'releve_bac',
    'diplome_bac',
    'lettre_motivation',
    'lettre_recommandation',
    'certificat_hsk'
  ));

-- Vérification
SELECT id, status FROM dossier_bourses;
