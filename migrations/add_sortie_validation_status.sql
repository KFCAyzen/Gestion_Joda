-- Ajout d'un statut explicite + colonnes de rejet sur les sorties comptables.
-- Les sorties non traitées (status='pending') ou rejetées (status='rejected') ne doivent
-- plus être comptabilisées dans les totaux ; seules les sorties validées impactent la compta.

ALTER TABLE public.sorties_comptables
  ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS rejected_by UUID DEFAULT NULL REFERENCES public.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS rejected_at TIMESTAMPTZ DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS rejection_reason TEXT DEFAULT NULL;

-- Backfill : les sorties qui possèdent déjà un validated_by sont considérées validées.
UPDATE public.sorties_comptables
   SET status = 'validated'
 WHERE validated_by IS NOT NULL
   AND status = 'pending';

-- Contrainte de domaine sur status
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'sorties_comptables_status_check'
  ) THEN
    ALTER TABLE public.sorties_comptables
      ADD CONSTRAINT sorties_comptables_status_check
      CHECK (status IN ('pending', 'validated', 'rejected'));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_sorties_comptables_status
  ON public.sorties_comptables(status);
