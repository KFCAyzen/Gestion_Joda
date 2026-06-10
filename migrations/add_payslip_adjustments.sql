-- Détail des primes et retenues d'une fiche de paie (motifs).
--
-- Les colonnes agrégées `primes` et `deductions` restent la source de vérité du
-- calcul (et de l'auto-génération SQL). Cette colonne stocke en plus le détail
-- ligne par ligne saisi à la main, pour afficher chaque motif sur le bulletin PDF.
--
-- Forme : [{ "type": "bonus" | "deduction", "motif": "...", "montant": 12345 }]
-- Les fiches auto-générées et les anciennes fiches gardent un tableau vide :
-- le PDF retombe alors sur les libellés agrégés « Primes et indemnités » /
-- « Retenues diverses ».

ALTER TABLE public.payslips
  ADD COLUMN IF NOT EXISTS adjustments JSONB NOT NULL DEFAULT '[]'::jsonb;
