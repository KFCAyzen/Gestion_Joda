-- Ajout colonnes motif de rejet sur les paiements déclarés par les étudiants
ALTER TABLE payments
  ADD COLUMN IF NOT EXISTS rejection_reason TEXT DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS rejected_at TIMESTAMPTZ DEFAULT NULL;
