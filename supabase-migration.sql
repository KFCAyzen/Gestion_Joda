// Script de création des tables pour Supabase
// Exécuter ce script dans le SQL Editor de Supabase

-- Table Users (utilisateurs)
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  username VARCHAR(100) UNIQUE NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  role VARCHAR(20) NOT NULL CHECK (role IN ('student', 'agent', 'admin', 'supervisor')),
  name VARCHAR(255) NOT NULL,
  must_change_password BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Table Students (étudiants)
CREATE TABLE IF NOT EXISTS students (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nom VARCHAR(100) NOT NULL,
  prenom VARCHAR(100) NOT NULL,
  email VARCHAR(255),
  telephone VARCHAR(50),
  age INTEGER,
  sexe VARCHAR(1) CHECK (sexe IN ('M', 'F')),
  niveau VARCHAR(100),
  filiere VARCHAR(100),
  langue VARCHAR(50),
  diplome_acquis VARCHAR(100),
  photo_url TEXT,
  passeport_numero VARCHAR(50),
  passeport_expiration DATE,
  passeport_url TEXT,
  choix VARCHAR(50) CHECK (choix IN ('procedure_seule', 'cours_seuls', 'procedure_cours')),
  user_id UUID REFERENCES users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID REFERENCES users(id)
);

-- Table Universités
CREATE TABLE IF NOT EXISTS universities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nom VARCHAR(255) NOT NULL,
  pays VARCHAR(100) DEFAULT 'Chine',
  ville VARCHAR(100),
  programme TEXT,
  niveau_etude VARCHAR(100),
  criteres_admission TEXT,
  logo_url TEXT,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Table Documents
CREATE TABLE IF NOT EXISTS documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID REFERENCES students(id) ON DELETE CASCADE,
  type VARCHAR(50) CHECK (type IN ('passeport', 'casier_judiciaire', 'carte_photo', 'releve_bac', 'diplome_bac')),
  status VARCHAR(20) DEFAULT 'en_attente' CHECK (status IN ('en_attente', 'valide', 'non_conforme')),
  url TEXT,
  uploaded_at TIMESTAMP WITH TIME ZONE,
  validated_at TIMESTAMP WITH TIME ZONE,
  validated_by UUID REFERENCES users(id),
  rejection_reason TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Table Dossiers de Bourse
CREATE TABLE IF NOT EXISTS dossier_bourses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID REFERENCES students(id) ON DELETE CASCADE,
  status VARCHAR(50) DEFAULT 'document_recu' CHECK (status IN ('document_recu', 'en_attente', 'en_cours', 'document_manquant', 'admission_validee', 'admission_rejetee', 'en_attente_universite', 'visa_en_cours', 'termine')),
  notes_internes TEXT,
  university_id UUID REFERENCES universities(id),
  assigned_to UUID REFERENCES users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Table Historique des Dossiers
CREATE TABLE IF NOT EXISTS dossier_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dossier_id UUID REFERENCES dossier_bourses(id) ON DELETE CASCADE,
  action VARCHAR(100) NOT NULL,
  status VARCHAR(50),
  description TEXT,
  performed_by UUID REFERENCES users(id),
  performed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  metadata JSONB
);

-- Table Paiements
CREATE TABLE IF NOT EXISTS payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID REFERENCES students(id) ON DELETE CASCADE,
  type VARCHAR(20) CHECK (type IN ('bourse', 'mandarin', 'anglais')),
  tranche INTEGER CHECK (tranche IN (1, 2, 3, 4)),
  montant INTEGER NOT NULL,
  status VARCHAR(20) DEFAULT 'attente' CHECK (status IN ('paye', 'attente', 'retard')),
  date_limite DATE NOT NULL,
  date_paiement DATE,
  penalites INTEGER DEFAULT 0,
  facture_url TEXT,
  recu_url TEXT,
  validated_by UUID REFERENCES users(id),
  validated_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Table Cours de Langues
CREATE TABLE IF NOT EXISTS cours_langues (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID REFERENCES students(id) ON DELETE CASCADE,
  langue VARCHAR(20) CHECK (langue IN ('mandarin', 'anglais')),
  statut VARCHAR(20) DEFAULT 'actif' CHECK (statut IN ('actif', 'termine', 'abandonne')),
  inscrit_le DATE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Table Comptabilité - Entrées
CREATE TABLE IF NOT EXISTS entrees_comptables (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  montant INTEGER NOT NULL,
  date DATE NOT NULL,
  type VARCHAR(50) CHECK (type IN ('paiement_procedure', 'paiement_cours', 'revenus_divers')),
  description TEXT,
  student_id UUID REFERENCES students(id),
  payment_id UUID REFERENCES payments(id),
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Table Comptabilité - Sorties
CREATE TABLE IF NOT EXISTS sorties_comptables (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  montant INTEGER NOT NULL,
  date DATE NOT NULL,
  categorie VARCHAR(50) CHECK (categorie IN ('loyer', 'salaires', 'fonctionnement', 'materiels', 'fournitures', 'transports', 'communication', 'partenaires', 'divers')),
  description TEXT,
  justificatif_url TEXT,
  validated_by UUID REFERENCES users(id),
  validated_at TIMESTAMP WITH TIME ZONE,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Table Notifications
CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  type VARCHAR(50) CHECK (type IN ('document_manquant', 'paiement_valide', 'retard_paiement', 'mise_a_jour_dossier')),
  titre VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  read BOOLEAN DEFAULT false,
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Table Messages
CREATE TABLE IF NOT EXISTS messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  from_user_id UUID REFERENCES users(id),
  to_user_id UUID REFERENCES users(id),
  subject VARCHAR(255) NOT NULL,
  content TEXT NOT NULL,
  read BOOLEAN DEFAULT false,
  attachments TEXT[],
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Créer les index pour optimiser les requêtes
CREATE INDEX IF NOT EXISTS idx_students_user_id ON students(user_id);
CREATE INDEX IF NOT EXISTS idx_documents_student_id ON documents(student_id);
CREATE INDEX IF NOT EXISTS idx_dossier_bourses_student_id ON dossier_bourses(student_id);
CREATE INDEX IF NOT EXISTS idx_dossier_history_dossier_id ON dossier_history(dossier_id);
CREATE INDEX IF NOT EXISTS idx_payments_student_id ON payments(student_id);
CREATE INDEX IF NOT EXISTS idx_cours_langues_student_id ON cours_langues(student_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_messages_from_user_id ON messages(from_user_id);
CREATE INDEX IF NOT EXISTS idx_messages_to_user_id ON messages(to_user_id);

-- Activer Row Level Security (RLS) pour la sécurité
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

-- Politique RLS pour les étudiants (accès par user_id ou agent/admin)
CREATE POLICY "students_access_policy" ON students
  FOR ALL
  USING (
    user_id = auth.uid() 
    OR EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('agent', 'admin', 'supervisor'))
  );

-- Politique RLS pour les documents (accès par student.user_id ou agent/admin)
CREATE POLICY "documents_access_policy" ON documents
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM students s 
      WHERE s.id = documents.student_id 
      AND (s.user_id = auth.uid() 
        OR EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('agent', 'admin', 'supervisor')))
    )
  );

-- Politique RLS pour les dossiers de bourse
CREATE POLICY "dossier_bourses_access_policy" ON dossier_bourses
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM students s 
      WHERE s.id = dossier_bourses.student_id 
      AND (s.user_id = auth.uid() 
        OR EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('agent', 'admin', 'supervisor')))
    )
  );

-- Politique RLS pour les paiements
CREATE POLICY "payments_access_policy" ON payments
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM students s 
      WHERE s.id = payments.student_id 
      AND (s.user_id = auth.uid() 
        OR EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('agent', 'admin', 'supervisor')))
    )
  );

-- Politique RLS pour les notifications (accès propre)
CREATE POLICY "notifications_access_policy" ON notifications
  FOR ALL
  USING (user_id = auth.uid());

-- Politique RLS pour les utilisateurs (accès propre + admin)
CREATE POLICY "users_access_policy" ON users
  FOR ALL
  USING (
    id = auth.uid() 
    OR EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
  );

-- Politique RLS pour les universities (visible par tous)
CREATE POLICY "universities_access_policy" ON universities
  FOR SELECT
  USING (true);

-- Politique RLS pour la comptabilité (agents et admin seulement)
CREATE POLICY "comptabilite_access_policy" ON entrees_comptables
  FOR ALL
  USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('agent', 'admin', 'supervisor'))
  );

CREATE POLICY "comptabilite_sorties_access_policy" ON sorties_comptables
  FOR ALL
  USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('agent', 'admin', 'supervisor'))
  );

console.log("✅ Tables créées avec succès dans Supabase!");