-- ================================================================
-- COMPTABILITÉ — Bons de caisse : avances nominatives à justifier (Phase 2)
-- ================================================================
-- À exécuter dans l'éditeur SQL Supabase. Idempotent (réexécutable).
-- Prérequis : add_sorties_tracabilite_phase1.sql (compta_has_permission,
-- bucket justificatifs-comptables, journal comptabilite_audit).
--
-- L'argent qui sort pour une petite dépense (transport, encre…) devient une
-- AVANCE faite à une personne nommée. Elle ne devient une dépense qu'une fois
-- justifiée et contrôlée ; d'ici là, la personne la doit.
--
--   demande ──► approuve ──► remis ──► justifie ──► cloture
--      │           │                     │
--      ├► refuse   └► annule             └► remis (justification rejetée)
--      └► annule
--
--   demande   : saisie par l'employé (app mobile agent), pour lui-même.
--   approuve  : décision d'un TIERS ; à partir du seuil (5 000 F par défaut)
--               seul un administrateur peut décider.
--   remis     : le caissier (permission accounting.disburse) remet l'argent.
--               La trésorerie baisse, l'échéance de justification (48 h par
--               défaut) démarre. Le bénéficiaire confirme la réception.
--   justifie  : le bénéficiaire joint la pièce (reçu, fiche de course, preuve
--               de mission) et déclare ce qu'il a dépensé ; le reste est à rendre.
--   cloture   : un contrôleur (accounting.validate, pas le bénéficiaire) accepte :
--               une sortie VALIDÉE du montant dépensé est créée dans le livre,
--               verrouillée ; la monnaie rendue revient à la trésorerie.
--
-- Une avance restée « remise » après son échéance BLOQUE toute nouvelle
-- demande de la même personne.

-- ================================================================
-- 1) Helpers et paramètres
-- ================================================================

-- Rôle du compte connecté s'il est actif (lu dans public.users, pas le JWT).
CREATE OR REPLACE FUNCTION public.compta_current_role()
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role::text FROM public.users WHERE id = auth.uid() AND COALESCE(is_active, true)
$$;

GRANT EXECUTE ON FUNCTION public.compta_current_role() TO authenticated;

-- Paramètres du circuit (une seule ligne). L'id fixe permet de tracer les
-- changements de seuil dans comptabilite_audit (record_id uuid).
CREATE TABLE IF NOT EXISTS public.compta_parametres (
  id uuid PRIMARY KEY DEFAULT '00000000-0000-0000-0000-000000000001'::uuid
    CHECK (id = '00000000-0000-0000-0000-000000000001'::uuid),
  -- À partir de ce montant (FCFA), seul un administrateur approuve un bon.
  seuil_approbation_admin numeric NOT NULL DEFAULT 5000 CHECK (seuil_approbation_admin > 0),
  -- Délai pour justifier une avance après sa remise.
  delai_justification_heures integer NOT NULL DEFAULT 48
    CHECK (delai_justification_heures BETWEEN 1 AND 720),
  updated_at timestamptz NOT NULL DEFAULT now()
);

INSERT INTO public.compta_parametres DEFAULT VALUES ON CONFLICT (id) DO NOTHING;

ALTER TABLE public.compta_parametres ENABLE ROW LEVEL SECURITY;
REVOKE INSERT, DELETE, TRUNCATE ON public.compta_parametres FROM anon, authenticated;
GRANT SELECT, UPDATE ON public.compta_parametres TO authenticated;

DROP POLICY IF EXISTS "compta_parametres_select" ON public.compta_parametres;
CREATE POLICY "compta_parametres_select" ON public.compta_parametres
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "compta_parametres_update" ON public.compta_parametres;
CREATE POLICY "compta_parametres_update" ON public.compta_parametres
  FOR UPDATE TO authenticated
  USING ((SELECT public.compta_current_role()) IN ('admin', 'super_admin'))
  WITH CHECK ((SELECT public.compta_current_role()) IN ('admin', 'super_admin'));

-- Nouveau droit accounting.disburse (tenir la caisse). Par défaut : admin et
-- super_admin (DEFAULT_ROLE_PERMISSIONS). Si le rôle admin a été personnalisé
-- dans l'onglet « Rôles », ses défauts viennent de la base : on l'y ajoute.
INSERT INTO public.role_permissions (role, permission, granted)
SELECT 'admin', 'accounting.disburse', true
WHERE EXISTS (SELECT 1 FROM public.role_permissions WHERE role = 'admin')
ON CONFLICT (role, permission) DO NOTHING;

-- ================================================================
-- 2) Table des bons de caisse
-- ================================================================
CREATE TABLE IF NOT EXISTS public.bons_caisse (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  -- Numéro lisible, reporté sur la sortie : BC-000042.
  numero bigint GENERATED ALWAYS AS IDENTITY UNIQUE,
  -- Nullable + SET NULL : supprimer un compte ne doit jamais effacer ses
  -- avances ; demandeur_nom garde l'identité.
  demandeur_id uuid REFERENCES public.users(id) ON DELETE SET NULL,
  demandeur_nom text NOT NULL,
  montant numeric NOT NULL CHECK (montant > 0),
  categorie text NOT NULL DEFAULT 'transports',
  -- Trajet et objet de la course, ou article et fournisseur.
  motif text NOT NULL CHECK (char_length(btrim(motif)) >= 10),
  student_id uuid REFERENCES public.students(id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'demande'
    CHECK (status IN ('demande', 'approuve', 'refuse', 'remis', 'justifie', 'cloture', 'annule')),
  -- Décision (approbation ou refus)
  decision_par uuid REFERENCES public.users(id) ON DELETE SET NULL,
  decision_at timestamptz,
  refus_motif text,
  -- Remise de l'argent
  remis_par uuid REFERENCES public.users(id) ON DELETE SET NULL,
  remis_at timestamptz,
  echeance_justification timestamptz,
  reception_confirmee_at timestamptz,
  -- Justification (chemins dans le bucket, sous bons/<demandeur_id>/)
  justificatif_path text,
  preuve_mission_path text,
  montant_depense numeric CHECK (montant_depense IS NULL OR montant_depense >= 0),
  justifie_at timestamptz,
  rejet_justification_motif text,
  -- Contrôle
  controle_par uuid REFERENCES public.users(id) ON DELETE SET NULL,
  controle_at timestamptz,
  -- Annulation
  annule_par uuid REFERENCES public.users(id) ON DELETE SET NULL,
  annule_at timestamptz,
  annulation_motif text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT bons_caisse_depense_max CHECK (montant_depense IS NULL OR montant_depense <= montant)
);

CREATE INDEX IF NOT EXISTS idx_bons_caisse_demandeur ON public.bons_caisse(demandeur_id, status);
CREATE INDEX IF NOT EXISTS idx_bons_caisse_status    ON public.bons_caisse(status);
CREATE INDEX IF NOT EXISTS idx_bons_caisse_echeance  ON public.bons_caisse(echeance_justification)
  WHERE status = 'remis';

-- Lien sortie ← bon (une sortie au plus par bon).
ALTER TABLE public.sorties_comptables
  ADD COLUMN IF NOT EXISTS bon_caisse_id uuid REFERENCES public.bons_caisse(id) ON DELETE SET NULL;
CREATE UNIQUE INDEX IF NOT EXISTS uq_sorties_bon_caisse
  ON public.sorties_comptables(bon_caisse_id) WHERE bon_caisse_id IS NOT NULL;

-- ================================================================
-- 3) Contrôle du circuit des bons
-- ================================================================
CREATE OR REPLACE FUNCTION public.trg_bons_caisse_controle()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_role text;
  v_params public.compta_parametres%ROWTYPE;
  v_req public.bons_caisse%ROWTYPE;
  v_prefix text;
  -- Colonnes posées par la base : jamais comparées à la demande du client.
  v_server text[] := ARRAY[
    'decision_par', 'decision_at', 'remis_par', 'remis_at', 'echeance_justification',
    'reception_confirmee_at', 'justifie_at', 'controle_par', 'controle_at',
    'annule_par', 'annule_at', 'updated_at'
  ];
  -- Colonnes que la transition elle-même remet à zéro : exclues aussi.
  v_ignore text[] := '{}';
BEGIN
  -- Chemins de confiance : contexte serveur (service role, SQL Editor) et
  -- écritures faites par un autre trigger.
  IF v_uid IS NULL OR pg_trigger_depth() > 1 THEN
    RETURN COALESCE(NEW, OLD);
  END IF;

  IF TG_OP = 'DELETE' THEN
    RAISE EXCEPTION 'Suppression interdite : un bon de caisse s''annule avec un motif.'
      USING ERRCODE = '42501';
  END IF;

  v_role := COALESCE(public.compta_current_role(), '');
  SELECT * INTO v_params FROM public.compta_parametres LIMIT 1;

  -- ---------------------------------------------------------------- INSERT
  IF TG_OP = 'INSERT' THEN
    IF v_role NOT IN ('agent', 'supervisor', 'admin', 'super_admin') THEN
      RAISE EXCEPTION 'Les bons de caisse sont réservés au personnel.' USING ERRCODE = '42501';
    END IF;
    IF EXISTS (
      SELECT 1 FROM public.bons_caisse
      WHERE demandeur_id = v_uid AND status = 'remis' AND echeance_justification < now()
    ) THEN
      RAISE EXCEPTION 'Vous avez une avance non justifiée dans le délai : régularisez-la avant toute nouvelle demande.'
        USING ERRCODE = '42501';
    END IF;
    -- Une demande est toujours faite pour soi, et part toujours du début du circuit.
    NEW.demandeur_id := v_uid;
    SELECT COALESCE(NULLIF(btrim(name), ''), email) INTO NEW.demandeur_nom
    FROM public.users WHERE id = v_uid;
    NEW.status := 'demande';
    NEW.decision_par := NULL;  NEW.decision_at := NULL;  NEW.refus_motif := NULL;
    NEW.remis_par := NULL;     NEW.remis_at := NULL;     NEW.echeance_justification := NULL;
    NEW.reception_confirmee_at := NULL;
    NEW.justificatif_path := NULL;  NEW.preuve_mission_path := NULL;
    NEW.montant_depense := NULL;    NEW.justifie_at := NULL;  NEW.rejet_justification_motif := NULL;
    NEW.controle_par := NULL;  NEW.controle_at := NULL;
    NEW.annule_par := NULL;    NEW.annule_at := NULL;    NEW.annulation_motif := NULL;
    NEW.created_at := now();   NEW.updated_at := now();
    RETURN NEW;
  END IF;

  -- ---------------------------------------------------------------- UPDATE
  IF OLD.status IN ('refuse', 'cloture', 'annule') THEN
    RAISE EXCEPTION 'Ce bon est %, il ne peut plus être modifié.',
      CASE OLD.status WHEN 'refuse' THEN 'refusé' WHEN 'cloture' THEN 'clôturé' ELSE 'annulé' END
      USING ERRCODE = '42501';
  END IF;

  -- On repart de l'existant : seule la transition demandée change quelque chose.
  v_req := NEW;
  NEW := OLD;
  NEW.updated_at := now();
  v_prefix := 'bons/' || OLD.demandeur_id::text || '/';

  IF v_req.status IS NOT DISTINCT FROM OLD.status THEN
    -- Sans changement d'état : le demandeur corrige sa demande, ou confirme
    -- avoir reçu l'argent.
    IF OLD.status = 'demande' AND v_uid = OLD.demandeur_id THEN
      NEW.montant := v_req.montant;
      NEW.categorie := v_req.categorie;
      NEW.motif := v_req.motif;
      NEW.student_id := v_req.student_id;
    ELSIF OLD.status = 'remis' AND v_uid = OLD.demandeur_id
          AND v_req.reception_confirmee_at IS NOT NULL AND OLD.reception_confirmee_at IS NULL THEN
      NEW.reception_confirmee_at := now();
    END IF;

  ELSIF OLD.status = 'demande' AND v_req.status IN ('approuve', 'refuse') THEN
    IF v_uid = OLD.demandeur_id THEN
      RAISE EXCEPTION 'Vous ne pouvez pas statuer sur votre propre demande.' USING ERRCODE = '42501';
    END IF;
    IF OLD.montant >= v_params.seuil_approbation_admin THEN
      IF v_role NOT IN ('admin', 'super_admin') THEN
        RAISE EXCEPTION 'À partir de % F, la décision revient à un administrateur.',
          v_params.seuil_approbation_admin USING ERRCODE = '42501';
      END IF;
    ELSIF NOT (public.compta_has_permission('accounting.validate') OR v_role IN ('admin', 'super_admin')) THEN
      RAISE EXCEPTION 'Vous n''avez pas le droit de statuer sur un bon de caisse.' USING ERRCODE = '42501';
    END IF;
    IF v_req.status = 'refuse' THEN
      IF NULLIF(btrim(v_req.refus_motif), '') IS NULL THEN
        RAISE EXCEPTION 'Le motif du refus est obligatoire.';
      END IF;
      NEW.refus_motif := v_req.refus_motif;
    END IF;
    NEW.status := v_req.status;
    NEW.decision_par := v_uid;
    NEW.decision_at := now();

  ELSIF OLD.status IN ('demande', 'approuve') AND v_req.status = 'annule' THEN
    -- Le demandeur peut retirer sa demande tant que l'argent n'est pas remis.
    IF v_uid IS DISTINCT FROM OLD.demandeur_id AND NOT public.compta_has_permission('accounting.delete') THEN
      RAISE EXCEPTION 'Vous n''avez pas le droit d''annuler ce bon.' USING ERRCODE = '42501';
    END IF;
    IF NULLIF(btrim(v_req.annulation_motif), '') IS NULL THEN
      RAISE EXCEPTION 'Le motif d''annulation est obligatoire.';
    END IF;
    NEW.status := 'annule';
    NEW.annulation_motif := v_req.annulation_motif;
    NEW.annule_par := v_uid;
    NEW.annule_at := now();

  ELSIF OLD.status = 'approuve' AND v_req.status = 'remis' THEN
    IF NOT public.compta_has_permission('accounting.disburse') THEN
      RAISE EXCEPTION 'Vous n''avez pas le droit de remettre de l''argent (caisse).' USING ERRCODE = '42501';
    END IF;
    IF v_uid = OLD.demandeur_id THEN
      RAISE EXCEPTION 'Vous ne pouvez pas vous remettre l''argent à vous-même.' USING ERRCODE = '42501';
    END IF;
    NEW.status := 'remis';
    NEW.remis_par := v_uid;
    NEW.remis_at := now();
    NEW.echeance_justification := now() + make_interval(hours => v_params.delai_justification_heures);

  ELSIF OLD.status = 'remis' AND v_req.status = 'justifie' THEN
    IF v_uid IS DISTINCT FROM OLD.demandeur_id THEN
      RAISE EXCEPTION 'Seul le bénéficiaire de l''avance peut la justifier.' USING ERRCODE = '42501';
    END IF;
    IF v_req.montant_depense IS NULL OR v_req.montant_depense < 0 OR v_req.montant_depense > OLD.montant THEN
      RAISE EXCEPTION 'Montant dépensé invalide : entre 0 et % F.', OLD.montant;
    END IF;
    IF v_req.montant_depense > 0 AND v_req.justificatif_path IS NULL THEN
      RAISE EXCEPTION 'Justificatif obligatoire : photo du reçu ou de la fiche de course.';
    END IF;
    IF v_req.justificatif_path IS NOT NULL AND (
         left(v_req.justificatif_path, length(v_prefix)) <> v_prefix
         OR NOT EXISTS (SELECT 1 FROM storage.objects
                        WHERE bucket_id = 'justificatifs-comptables' AND name = v_req.justificatif_path)) THEN
      RAISE EXCEPTION 'Justificatif introuvable : déposez la pièce avant de justifier.';
    END IF;
    IF v_req.preuve_mission_path IS NOT NULL AND (
         left(v_req.preuve_mission_path, length(v_prefix)) <> v_prefix
         OR NOT EXISTS (SELECT 1 FROM storage.objects
                        WHERE bucket_id = 'justificatifs-comptables' AND name = v_req.preuve_mission_path)) THEN
      RAISE EXCEPTION 'Preuve de mission introuvable : déposez la pièce avant de justifier.';
    END IF;
    NEW.status := 'justifie';
    NEW.montant_depense := v_req.montant_depense;
    NEW.justificatif_path := v_req.justificatif_path;
    NEW.preuve_mission_path := v_req.preuve_mission_path;
    NEW.justifie_at := now();
    -- Justifier vaut confirmation de réception.
    NEW.reception_confirmee_at := COALESCE(OLD.reception_confirmee_at, now());
    NEW.rejet_justification_motif := NULL;
    v_ignore := ARRAY['rejet_justification_motif'];

  ELSIF OLD.status = 'justifie' AND v_req.status IN ('cloture', 'remis') THEN
    IF NOT public.compta_has_permission('accounting.validate') THEN
      RAISE EXCEPTION 'Vous n''avez pas le droit de contrôler un bon de caisse.' USING ERRCODE = '42501';
    END IF;
    IF v_uid = OLD.demandeur_id THEN
      RAISE EXCEPTION 'Vous ne pouvez pas contrôler votre propre avance.' USING ERRCODE = '42501';
    END IF;
    NEW.controle_par := v_uid;
    NEW.controle_at := now();
    IF v_req.status = 'cloture' THEN
      NEW.status := 'cloture';
    ELSE
      -- Justification rejetée : l'avance redevient due, pièce à refaire.
      IF NULLIF(btrim(v_req.rejet_justification_motif), '') IS NULL THEN
        RAISE EXCEPTION 'Le motif du rejet de la justification est obligatoire.';
      END IF;
      NEW.status := 'remis';
      NEW.rejet_justification_motif := v_req.rejet_justification_motif;
      NEW.justificatif_path := NULL;
      NEW.preuve_mission_path := NULL;
      NEW.montant_depense := NULL;
      NEW.justifie_at := NULL;
      v_ignore := ARRAY['justificatif_path', 'preuve_mission_path', 'montant_depense'];
    END IF;

  ELSE
    RAISE EXCEPTION 'Transition non autorisée : % → %.', OLD.status, v_req.status USING ERRCODE = '42501';
  END IF;

  -- Tout autre changement demandé est refusé (plutôt qu'ignoré en silence).
  IF (to_jsonb(v_req) - v_server - v_ignore) IS DISTINCT FROM (to_jsonb(NEW) - v_server - v_ignore) THEN
    RAISE EXCEPTION 'Modification non autorisée à ce stade du bon de caisse.' USING ERRCODE = '42501';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS bons_caisse_controle_biud ON public.bons_caisse;
CREATE TRIGGER bons_caisse_controle_biud
BEFORE INSERT OR UPDATE OR DELETE ON public.bons_caisse
FOR EACH ROW EXECUTE FUNCTION public.trg_bons_caisse_controle();

-- ================================================================
-- 4) Clôture → sortie validée dans le livre comptable
-- ================================================================
CREATE OR REPLACE FUNCTION public.trg_bons_caisse_cloture()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.status = 'cloture' AND OLD.status IS DISTINCT FROM 'cloture'
     AND COALESCE(NEW.montant_depense, 0) > 0 THEN
    -- Insérée depuis un trigger : le contrôle des sorties la laisse passer
    -- telle quelle (validée), et la verrouille ensuite (bon_caisse_id).
    INSERT INTO public.sorties_comptables (
      montant, date, categorie, description, devise, status,
      created_by, validated_by, validated_at,
      justificatif_path, beneficiaire_id, beneficiaire_nom, bon_caisse_id
    ) VALUES (
      NEW.montant_depense, CURRENT_DATE, NEW.categorie,
      format('Bon de caisse BC-%s — %s', lpad(NEW.numero::text, 6, '0'), NEW.motif),
      'FCFA', 'validated',
      NEW.demandeur_id, NEW.controle_par, NEW.controle_at,
      NEW.justificatif_path, NEW.demandeur_id, NEW.demandeur_nom, NEW.id
    );
  END IF;
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS bons_caisse_cloture_au ON public.bons_caisse;
CREATE TRIGGER bons_caisse_cloture_au
AFTER UPDATE OF status ON public.bons_caisse
FOR EACH ROW EXECUTE FUNCTION public.trg_bons_caisse_cloture();

-- Une sortie issue d'un bon se gère depuis le bon : ni création à la main,
-- ni modification, ni suppression (complète trg_sorties_comptables_controle).
CREATE OR REPLACE FUNCTION public.trg_sorties_bon_caisse_verrou()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL OR pg_trigger_depth() > 1 THEN
    RETURN COALESCE(NEW, OLD);
  END IF;
  IF (TG_OP = 'INSERT' AND NEW.bon_caisse_id IS NOT NULL)
     OR (TG_OP IN ('UPDATE', 'DELETE') AND OLD.bon_caisse_id IS NOT NULL)
     OR (TG_OP = 'UPDATE' AND NEW.bon_caisse_id IS DISTINCT FROM OLD.bon_caisse_id) THEN
    RAISE EXCEPTION 'Sortie issue d''un bon de caisse : elle se gère depuis le bon.' USING ERRCODE = '42501';
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS sorties_bon_caisse_verrou_biud ON public.sorties_comptables;
CREATE TRIGGER sorties_bon_caisse_verrou_biud
BEFORE INSERT OR UPDATE OR DELETE ON public.sorties_comptables
FOR EACH ROW EXECUTE FUNCTION public.trg_sorties_bon_caisse_verrou();

-- ================================================================
-- 5) Trésorerie : l'argent remis quitte la caisse dès la remise
-- ================================================================
-- Effet d'un bon sur le solde FCFA : −montant tant qu'il est « remis » ou
-- « justifie ». À la clôture l'effet disparaît et la sortie du montant
-- dépensé prend le relais : la monnaie rendue revient donc à la trésorerie.
CREATE OR REPLACE FUNCTION public.trg_bons_caisse_solde()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  old_eff numeric := 0;
  new_eff numeric := 0;
BEGIN
  IF TG_OP IN ('UPDATE', 'DELETE') AND OLD.status IN ('remis', 'justifie') THEN
    old_eff := -OLD.montant;
  END IF;
  IF TG_OP IN ('UPDATE', 'INSERT') AND NEW.status IN ('remis', 'justifie') THEN
    new_eff := -NEW.montant;
  END IF;
  PERFORM public.apply_comptabilite_solde_delta(new_eff - old_eff, 'FCFA');
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS bons_caisse_solde_aiud ON public.bons_caisse;
CREATE TRIGGER bons_caisse_solde_aiud
AFTER INSERT OR UPDATE OR DELETE ON public.bons_caisse
FOR EACH ROW EXECUTE FUNCTION public.trg_bons_caisse_solde();

-- Réconciliation : même règle que les triggers (avances en cours déduites).
CREATE OR REPLACE FUNCTION public.reconcile_comptabilite_solde()
RETURNS numeric
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_fcfa numeric;
BEGIN
  INSERT INTO public.comptabilite_solde (devise, solde, updated_at)
  SELECT d.devise,
         COALESCE((SELECT SUM(montant) FROM public.entrees_comptables e WHERE e.devise = d.devise), 0)
       - COALESCE((SELECT SUM(montant) FROM public.sorties_comptables s
                    WHERE s.devise = d.devise AND s.status = 'validated'), 0)
       - CASE WHEN d.devise = 'FCFA'
              THEN COALESCE((SELECT SUM(montant) FROM public.bons_caisse b
                             WHERE b.status IN ('remis', 'justifie')), 0)
              ELSE 0 END,
         now()
  FROM (VALUES ('FCFA'), ('USD')) AS d(devise)
  ON CONFLICT (devise) DO UPDATE SET solde = EXCLUDED.solde, updated_at = now();
  SELECT solde INTO v_fcfa FROM public.comptabilite_solde WHERE devise = 'FCFA';
  RETURN COALESCE(v_fcfa, 0);
END;
$$;

-- ================================================================
-- 6) Journal d'audit (fonction de la Phase 1)
-- ================================================================
DROP TRIGGER IF EXISTS bons_caisse_audit_aiud ON public.bons_caisse;
CREATE TRIGGER bons_caisse_audit_aiud
AFTER INSERT OR UPDATE OR DELETE ON public.bons_caisse
FOR EACH ROW EXECUTE FUNCTION public.trg_comptabilite_audit();

DROP TRIGGER IF EXISTS compta_parametres_audit_aiud ON public.compta_parametres;
CREATE TRIGGER compta_parametres_audit_aiud
AFTER UPDATE ON public.compta_parametres
FOR EACH ROW EXECUTE FUNCTION public.trg_comptabilite_audit();

-- ================================================================
-- 7) RLS
-- ================================================================
ALTER TABLE public.bons_caisse ENABLE ROW LEVEL SECURITY;
REVOKE DELETE, TRUNCATE ON public.bons_caisse FROM anon, authenticated;
GRANT SELECT, INSERT, UPDATE ON public.bons_caisse TO authenticated;

DROP POLICY IF EXISTS "bons_select" ON public.bons_caisse;
DROP POLICY IF EXISTS "bons_insert" ON public.bons_caisse;
DROP POLICY IF EXISTS "bons_update" ON public.bons_caisse;

-- Chacun voit ses propres bons ; la comptabilité et les admins voient tout.
CREATE POLICY "bons_select" ON public.bons_caisse
  FOR SELECT TO authenticated
  USING (
    demandeur_id = (SELECT auth.uid())
    OR (SELECT public.compta_has_permission('accounting.view'))
    OR (SELECT public.compta_current_role()) IN ('admin', 'super_admin')
  );

CREATE POLICY "bons_insert" ON public.bons_caisse
  FOR INSERT TO authenticated
  WITH CHECK ((SELECT public.compta_current_role()) IN ('agent', 'supervisor', 'admin', 'super_admin'));

-- Qui peut agir sur un bon ; le détail est tranché par trg_bons_caisse_controle.
CREATE POLICY "bons_update" ON public.bons_caisse
  FOR UPDATE TO authenticated
  USING (
    demandeur_id = (SELECT auth.uid())
    OR (SELECT public.compta_has_permission('accounting.validate'))
    OR (SELECT public.compta_has_permission('accounting.disburse'))
    OR (SELECT public.compta_has_permission('accounting.delete'))
    OR (SELECT public.compta_current_role()) IN ('admin', 'super_admin')
  )
  WITH CHECK (
    demandeur_id = (SELECT auth.uid())
    OR (SELECT public.compta_has_permission('accounting.validate'))
    OR (SELECT public.compta_has_permission('accounting.disburse'))
    OR (SELECT public.compta_has_permission('accounting.delete'))
    OR (SELECT public.compta_current_role()) IN ('admin', 'super_admin')
  );
-- Aucune policy DELETE.

-- Justificatifs des bons : chacun dépose et relit dans SON dossier
-- bons/<son id>/ (la comptabilité lit tout via justificatifs_compta_select).
DROP POLICY IF EXISTS "justificatifs_bons_insert_own" ON storage.objects;
CREATE POLICY "justificatifs_bons_insert_own" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'justificatifs-comptables'
    AND (storage.foldername(name))[1] = 'bons'
    AND (storage.foldername(name))[2] = (SELECT auth.uid())::text
    AND (SELECT public.compta_current_role()) IN ('agent', 'supervisor', 'admin', 'super_admin')
  );

DROP POLICY IF EXISTS "justificatifs_bons_select_own" ON storage.objects;
CREATE POLICY "justificatifs_bons_select_own" ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'justificatifs-comptables'
    AND (storage.foldername(name))[1] = 'bons'
    AND (storage.foldername(name))[2] = (SELECT auth.uid())::text
  );

-- ================================================================
-- Vérification
-- ================================================================
SELECT tablename, policyname, cmd
FROM pg_policies
WHERE (schemaname = 'public' AND tablename IN ('bons_caisse', 'compta_parametres'))
   OR (schemaname = 'storage' AND policyname LIKE 'justificatifs_%')
ORDER BY tablename, policyname;

SELECT tgname, tgrelid::regclass AS table_name
FROM pg_trigger
WHERE NOT tgisinternal
  AND tgrelid IN ('public.bons_caisse'::regclass, 'public.sorties_comptables'::regclass)
ORDER BY 2, 1;

SELECT * FROM public.compta_parametres;
