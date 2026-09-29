-- ================================================================
-- COMPTABILITÉ — Contrôle de la trésorerie (Phase 3)
-- ================================================================
-- À exécuter dans l'éditeur SQL Supabase. Idempotent (réexécutable).
-- Prérequis : add_sorties_tracabilite_phase1.sql puis add_bons_caisse_phase2.sql.
--
-- Les phases 1 et 2 tracent chaque sortie d'argent. Cette phase vérifie que
-- la caisse réelle correspond aux livres, fige le passé et signale ce qui
-- mérite un regard :
--
--   1. cache du solde : la fonction d'ajustement n'est plus appelable par les
--      clients (n'importe quel compte pouvait déplacer le solde affiché) ;
--   2. arrêtés de trésorerie : comptage physique (espèces billet par billet,
--      Mobile Money, banque) comparé au solde théorique recalculé par la base ;
--      tout écart doit être expliqué et un tiers contrôle l'arrêté ;
--   3. clôture mensuelle : un mois clôturé est figé (ni saisie, ni
--      modification, ni suppression d'écriture datée de ce mois) ; seul un
--      super administrateur peut le rouvrir, avec un motif ;
--   4. budgets mensuels par catégorie : au-delà, valider une sortie ou
--      approuver un bon revient à un administrateur ;
--   5. grille des transports : un bon de transport hors grille ou au-dessus
--      du tarif revient à un administrateur ;
--   6. rapport d'anomalies calculé par la base (fractionnement, encaissements
--      non comptabilisés, entrées supprimées ou modifiées, écarts de caisse…).

-- ================================================================
-- 1) Cache du solde : ajustement réservé aux triggers
-- ================================================================
-- apply_comptabilite_solde_delta est SECURITY DEFINER et, faute de REVOKE,
-- exécutable par tout compte via l'API (rpc) : on pouvait décaler le solde
-- affiché pour masquer un manque en caisse. Les triggers (SECURITY DEFINER,
-- propriétaire postgres) continuent de l'appeler.
REVOKE EXECUTE ON FUNCTION public.apply_comptabilite_solde_delta(numeric, text) FROM PUBLIC, anon, authenticated;

-- ================================================================
-- 2) Paramètres et permission
-- ================================================================
ALTER TABLE public.compta_parametres
  -- Au-delà de ce nombre de jours sans arrêté de caisse : anomalie.
  ADD COLUMN IF NOT EXISTS frequence_arrete_jours integer NOT NULL DEFAULT 7
    CHECK (frequence_arrete_jours BETWEEN 1 AND 90),
  -- Une sortie en attente depuis plus longtemps : anomalie.
  ADD COLUMN IF NOT EXISTS delai_sortie_attente_jours integer NOT NULL DEFAULT 7
    CHECK (delai_sortie_attente_jours BETWEEN 1 AND 90);

-- Nouveau droit accounting.close (clôturer un mois). Par défaut : admin et
-- super_admin (DEFAULT_ROLE_PERMISSIONS). Même logique qu'accounting.disburse.
INSERT INTO public.role_permissions (role, permission, granted)
SELECT 'admin', 'accounting.close', true
WHERE EXISTS (SELECT 1 FROM public.role_permissions WHERE role = 'admin')
ON CONFLICT (role, permission) DO NOTHING;

-- Mois comptable (1er du mois) d'un instant, à l'heure de Douala.
CREATE OR REPLACE FUNCTION public.compta_mois_de(p_at timestamptz)
RETURNS date
LANGUAGE sql
STABLE
AS $$
  SELECT date_trunc('month', (p_at AT TIME ZONE 'Africa/Douala'))::date
$$;

-- Solde théorique d'une devise recalculé depuis les écritures (et non lu
-- dans le cache) : entrées − sorties validées − avances en cours (FCFA).
CREATE OR REPLACE FUNCTION public.compta_solde_theorique(p_devise text)
RETURNS numeric
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT (COALESCE((SELECT SUM(montant) FROM public.entrees_comptables WHERE devise = p_devise), 0)::numeric
        - COALESCE((SELECT SUM(montant) FROM public.sorties_comptables
                     WHERE devise = p_devise AND status = 'validated'), 0)::numeric
        - CASE WHEN p_devise = 'FCFA'
               THEN COALESCE((SELECT SUM(montant) FROM public.bons_caisse
                              WHERE status IN ('remis', 'justifie')), 0)
               ELSE 0 END)::numeric
$$;

REVOKE EXECUTE ON FUNCTION public.compta_solde_theorique(text) FROM PUBLIC, anon, authenticated;

-- ================================================================
-- 3) Arrêtés de trésorerie (comptage de caisse)
-- ================================================================
--   soumis ──► valide
--      └────► conteste   (le comptage est refait par un nouvel arrêté)
CREATE TABLE IF NOT EXISTS public.compta_arretes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  numero bigint GENERATED ALWAYS AS IDENTITY UNIQUE,
  devise text NOT NULL DEFAULT 'FCFA' CHECK (devise IN ('FCFA', 'USD')),
  -- Détail des espèces : {"10000": 3, "500": 12} (valeur faciale → nombre).
  -- Quand il est fourni, la base en déduit `especes`.
  billetage jsonb,
  especes numeric NOT NULL CHECK (especes >= 0),
  -- Soldes relevés au même moment (application Mobile Money, relevé bancaire).
  mobile_money numeric NOT NULL DEFAULT 0 CHECK (mobile_money >= 0),
  banque numeric NOT NULL DEFAULT 0 CHECK (banque >= 0),
  -- Posés par la base au moment du comptage.
  solde_theorique numeric NOT NULL DEFAULT 0,
  avances_en_cours numeric NOT NULL DEFAULT 0,
  -- Réel − théorique : négatif = manquant, positif = excédent.
  ecart numeric NOT NULL DEFAULT 0,
  explication text,
  status text NOT NULL DEFAULT 'soumis' CHECK (status IN ('soumis', 'valide', 'conteste')),
  compte_par uuid REFERENCES public.users(id) ON DELETE SET NULL,
  compte_par_nom text,
  controle_par uuid REFERENCES public.users(id) ON DELETE SET NULL,
  controle_at timestamptz,
  controle_commentaire text,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT compta_arretes_explication_check
    CHECK (ecart = 0 OR char_length(btrim(COALESCE(explication, ''))) >= 10),
  CONSTRAINT compta_arretes_contestation_check
    CHECK (status <> 'conteste' OR char_length(btrim(COALESCE(controle_commentaire, ''))) >= 5)
);

CREATE INDEX IF NOT EXISTS idx_compta_arretes_devise_date ON public.compta_arretes(devise, created_at DESC);

CREATE OR REPLACE FUNCTION public.trg_compta_arretes_controle()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_role text;
  v_req public.compta_arretes%ROWTYPE;
  v_coupure text;
  v_nombre jsonb;
  v_especes numeric := 0;
BEGIN
  IF v_uid IS NULL OR pg_trigger_depth() > 1 THEN
    RETURN COALESCE(NEW, OLD);
  END IF;

  IF TG_OP = 'DELETE' THEN
    RAISE EXCEPTION 'Suppression interdite : un arrêté erroné se conteste, puis on recompte.'
      USING ERRCODE = '42501';
  END IF;

  v_role := COALESCE(public.compta_current_role(), '');

  -- ---------------------------------------------------------------- INSERT
  IF TG_OP = 'INSERT' THEN
    IF NOT (public.compta_has_permission('accounting.disburse')
            OR public.compta_has_permission('accounting.validate')
            OR v_role IN ('admin', 'super_admin')) THEN
      RAISE EXCEPTION 'Vous n''avez pas le droit d''arrêter la caisse.' USING ERRCODE = '42501';
    END IF;

    IF NEW.billetage IS NOT NULL THEN
      IF jsonb_typeof(NEW.billetage) <> 'object' THEN
        RAISE EXCEPTION 'Billetage invalide.';
      END IF;
      FOR v_coupure, v_nombre IN SELECT key, value FROM jsonb_each(NEW.billetage) LOOP
        IF v_coupure !~ '^[0-9]+(\.[0-9]+)?$'
           OR jsonb_typeof(v_nombre) <> 'number'
           OR (v_nombre #>> '{}')::numeric < 0
           OR (v_nombre #>> '{}')::numeric <> trunc((v_nombre #>> '{}')::numeric) THEN
          RAISE EXCEPTION 'Billetage invalide : « % » → %.', v_coupure, v_nombre;
        END IF;
        v_especes := v_especes + v_coupure::numeric * (v_nombre #>> '{}')::numeric;
      END LOOP;
      NEW.especes := v_especes;
    END IF;

    NEW.compte_par := v_uid;
    SELECT COALESCE(NULLIF(btrim(name), ''), email) INTO NEW.compte_par_nom
    FROM public.users WHERE id = v_uid;
    NEW.solde_theorique := public.compta_solde_theorique(NEW.devise);
    NEW.avances_en_cours := CASE WHEN NEW.devise = 'FCFA'
      THEN COALESCE((SELECT SUM(montant) FROM public.bons_caisse WHERE status IN ('remis', 'justifie')), 0)
      ELSE 0 END;
    NEW.ecart := NEW.especes + NEW.mobile_money + NEW.banque - NEW.solde_theorique;
    NEW.status := 'soumis';
    NEW.controle_par := NULL;
    NEW.controle_at := NULL;
    NEW.controle_commentaire := NULL;
    NEW.created_at := now();

    IF NEW.ecart <> 0 AND char_length(btrim(COALESCE(NEW.explication, ''))) < 10 THEN
      RAISE EXCEPTION 'Écart de % % entre le comptage et les livres : expliquez-le (10 caractères minimum).',
        NEW.ecart, NEW.devise;
    END IF;
    RETURN NEW;
  END IF;

  -- ---------------------------------------------------------------- UPDATE
  -- Un arrêté ne se corrige pas : seul le contrôle (validation ou
  -- contestation) par un autre compte le fait avancer.
  IF OLD.status <> 'soumis' THEN
    RAISE EXCEPTION 'Cet arrêté est déjà contrôlé.' USING ERRCODE = '42501';
  END IF;
  IF NEW.status NOT IN ('valide', 'conteste') THEN
    RAISE EXCEPTION 'Un arrêté ne se modifie pas : contestez-le puis refaites le comptage.'
      USING ERRCODE = '42501';
  END IF;
  IF NOT (public.compta_has_permission('accounting.validate') OR v_role IN ('admin', 'super_admin')) THEN
    RAISE EXCEPTION 'Vous n''avez pas le droit de contrôler un arrêté de caisse.' USING ERRCODE = '42501';
  END IF;
  IF v_uid = OLD.compte_par THEN
    RAISE EXCEPTION 'Vous ne pouvez pas contrôler votre propre comptage.' USING ERRCODE = '42501';
  END IF;
  IF NEW.status = 'conteste' AND char_length(btrim(COALESCE(NEW.controle_commentaire, ''))) < 5 THEN
    RAISE EXCEPTION 'Dites pourquoi vous contestez ce comptage.';
  END IF;

  v_req := NEW;
  NEW := OLD;
  NEW.status := v_req.status;
  NEW.controle_commentaire := NULLIF(btrim(COALESCE(v_req.controle_commentaire, '')), '');
  NEW.controle_par := v_uid;
  NEW.controle_at := now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS compta_arretes_controle_biud ON public.compta_arretes;
CREATE TRIGGER compta_arretes_controle_biud
BEFORE INSERT OR UPDATE OR DELETE ON public.compta_arretes
FOR EACH ROW EXECUTE FUNCTION public.trg_compta_arretes_controle();

DROP TRIGGER IF EXISTS compta_arretes_audit_aiud ON public.compta_arretes;
CREATE TRIGGER compta_arretes_audit_aiud
AFTER INSERT OR UPDATE OR DELETE ON public.compta_arretes
FOR EACH ROW EXECUTE FUNCTION public.trg_comptabilite_audit();

ALTER TABLE public.compta_arretes ENABLE ROW LEVEL SECURITY;
REVOKE DELETE, TRUNCATE ON public.compta_arretes FROM anon, authenticated;
GRANT SELECT, INSERT, UPDATE ON public.compta_arretes TO authenticated;

DROP POLICY IF EXISTS "arretes_select" ON public.compta_arretes;
CREATE POLICY "arretes_select" ON public.compta_arretes
  FOR SELECT TO authenticated
  USING (
    (SELECT public.compta_has_permission('accounting.view'))
    OR (SELECT public.compta_current_role()) IN ('admin', 'super_admin')
  );

DROP POLICY IF EXISTS "arretes_insert" ON public.compta_arretes;
CREATE POLICY "arretes_insert" ON public.compta_arretes
  FOR INSERT TO authenticated
  WITH CHECK (
    (SELECT public.compta_has_permission('accounting.disburse'))
    OR (SELECT public.compta_has_permission('accounting.validate'))
    OR (SELECT public.compta_current_role()) IN ('admin', 'super_admin')
  );

DROP POLICY IF EXISTS "arretes_update" ON public.compta_arretes;
CREATE POLICY "arretes_update" ON public.compta_arretes
  FOR UPDATE TO authenticated
  USING (
    (SELECT public.compta_has_permission('accounting.validate'))
    OR (SELECT public.compta_current_role()) IN ('admin', 'super_admin')
  )
  WITH CHECK (
    (SELECT public.compta_has_permission('accounting.validate'))
    OR (SELECT public.compta_current_role()) IN ('admin', 'super_admin')
  );

-- ================================================================
-- 4) Clôture mensuelle
-- ================================================================
CREATE TABLE IF NOT EXISTS public.compta_clotures (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  -- 1er jour du mois clôturé.
  mois date NOT NULL UNIQUE CHECK (mois = date_trunc('month', mois)::date),
  status text NOT NULL DEFAULT 'cloture' CHECK (status IN ('cloture', 'rouvert')),
  -- Instantané à la clôture, par devise :
  -- {"FCFA": {"entrees": 0, "sorties": 0, "nb_entrees": 0, "nb_sorties": 0}, "USD": {...}}
  totaux jsonb NOT NULL DEFAULT '{}'::jsonb,
  commentaire text,
  cloture_par uuid REFERENCES public.users(id) ON DELETE SET NULL,
  cloture_par_nom text,
  cloture_at timestamptz NOT NULL DEFAULT now(),
  rouvert_par uuid REFERENCES public.users(id) ON DELETE SET NULL,
  rouvert_par_nom text,
  rouvert_at timestamptz,
  motif_reouverture text
);

-- Écrite uniquement par les fonctions ci-dessous (SECURITY DEFINER).
ALTER TABLE public.compta_clotures ENABLE ROW LEVEL SECURITY;
REVOKE INSERT, UPDATE, DELETE, TRUNCATE ON public.compta_clotures FROM anon, authenticated;
GRANT SELECT ON public.compta_clotures TO authenticated;

DROP POLICY IF EXISTS "clotures_select" ON public.compta_clotures;
CREATE POLICY "clotures_select" ON public.compta_clotures
  FOR SELECT TO authenticated
  USING (
    (SELECT public.compta_has_permission('accounting.view'))
    OR (SELECT public.compta_current_role()) IN ('admin', 'super_admin')
  );

DROP TRIGGER IF EXISTS compta_clotures_audit_aiud ON public.compta_clotures;
CREATE TRIGGER compta_clotures_audit_aiud
AFTER INSERT OR UPDATE OR DELETE ON public.compta_clotures
FOR EACH ROW EXECUTE FUNCTION public.trg_comptabilite_audit();

CREATE OR REPLACE FUNCTION public.compta_mois_cloture(p_date date)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.compta_clotures
    WHERE mois = date_trunc('month', p_date)::date AND status = 'cloture'
  )
$$;

GRANT EXECUTE ON FUNCTION public.compta_mois_cloture(date) TO authenticated;

CREATE OR REPLACE FUNCTION public.compta_cloturer_mois(p_mois date, p_commentaire text DEFAULT NULL)
RETURNS public.compta_clotures
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_mois date := date_trunc('month', p_mois)::date;
  v_fin date := (date_trunc('month', p_mois) + interval '1 month')::date;
  v_nom text;
  v_attente integer;
  v_totaux jsonb;
  v_row public.compta_clotures;
BEGIN
  IF v_uid IS NULL OR NOT public.compta_has_permission('accounting.close') THEN
    RAISE EXCEPTION 'Vous n''avez pas le droit de clôturer une période.' USING ERRCODE = '42501';
  END IF;
  IF v_mois >= public.compta_mois_de(now()) THEN
    RAISE EXCEPTION 'On ne clôture qu''un mois terminé.';
  END IF;
  IF public.compta_mois_cloture(v_mois) THEN
    RAISE EXCEPTION 'Ce mois est déjà clôturé.';
  END IF;

  SELECT count(*) INTO v_attente
  FROM public.sorties_comptables
  WHERE status = 'pending' AND date >= v_mois AND date < v_fin;
  IF v_attente > 0 THEN
    RAISE EXCEPTION '% sortie(s) de ce mois encore en attente : validez-les, rejetez-les ou annulez-les avant de clôturer.',
      v_attente;
  END IF;

  SELECT jsonb_object_agg(d.devise, jsonb_build_object(
           'entrees',    COALESCE((SELECT SUM(montant) FROM public.entrees_comptables
                                   WHERE devise = d.devise AND date >= v_mois AND date < v_fin), 0),
           'nb_entrees', (SELECT count(*) FROM public.entrees_comptables
                          WHERE devise = d.devise AND date >= v_mois AND date < v_fin),
           'sorties',    COALESCE((SELECT SUM(montant) FROM public.sorties_comptables
                                   WHERE devise = d.devise AND status = 'validated'
                                     AND date >= v_mois AND date < v_fin), 0),
           'nb_sorties', (SELECT count(*) FROM public.sorties_comptables
                          WHERE devise = d.devise AND status = 'validated'
                            AND date >= v_mois AND date < v_fin)))
  INTO v_totaux
  FROM (VALUES ('FCFA'), ('USD')) AS d(devise);

  SELECT COALESCE(NULLIF(btrim(name), ''), email) INTO v_nom FROM public.users WHERE id = v_uid;

  INSERT INTO public.compta_clotures AS c (mois, status, totaux, commentaire, cloture_par, cloture_par_nom, cloture_at)
  VALUES (v_mois, 'cloture', v_totaux, NULLIF(btrim(COALESCE(p_commentaire, '')), ''), v_uid, v_nom, now())
  ON CONFLICT (mois) DO UPDATE
    SET status = 'cloture',
        totaux = EXCLUDED.totaux,
        commentaire = EXCLUDED.commentaire,
        cloture_par = EXCLUDED.cloture_par,
        cloture_par_nom = EXCLUDED.cloture_par_nom,
        cloture_at = EXCLUDED.cloture_at
  RETURNING c.* INTO v_row;
  RETURN v_row;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.compta_cloturer_mois(date, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.compta_cloturer_mois(date, text) TO authenticated;

CREATE OR REPLACE FUNCTION public.compta_rouvrir_mois(p_mois date, p_motif text)
RETURNS public.compta_clotures
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_nom text;
  v_row public.compta_clotures;
BEGIN
  IF v_uid IS NULL OR COALESCE(public.compta_current_role(), '') <> 'super_admin' THEN
    RAISE EXCEPTION 'Seul un super administrateur peut rouvrir un mois clôturé.' USING ERRCODE = '42501';
  END IF;
  IF char_length(btrim(COALESCE(p_motif, ''))) < 10 THEN
    RAISE EXCEPTION 'Le motif de réouverture est obligatoire (10 caractères minimum).';
  END IF;

  SELECT COALESCE(NULLIF(btrim(name), ''), email) INTO v_nom FROM public.users WHERE id = v_uid;

  UPDATE public.compta_clotures
  SET status = 'rouvert',
      rouvert_par = v_uid,
      rouvert_par_nom = v_nom,
      rouvert_at = now(),
      motif_reouverture = btrim(p_motif)
  WHERE mois = date_trunc('month', p_mois)::date AND status = 'cloture'
  RETURNING * INTO v_row;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Ce mois n''est pas clôturé.';
  END IF;
  RETURN v_row;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.compta_rouvrir_mois(date, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.compta_rouvrir_mois(date, text) TO authenticated;

-- Verrou de période sur les écritures. S'ajoute aux contrôles des phases 1-2.
CREATE OR REPLACE FUNCTION public.trg_compta_periode_verrou()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  -- Références qu'une clé étrangère peut remettre à NULL (compte, étudiant,
  -- paiement supprimé…) sans toucher aux montants.
  v_refs text[] := ARRAY[
    'created_by', 'validated_by', 'rejected_by', 'cancelled_by', 'beneficiaire_id',
    'student_id', 'payment_id', 'payslip_id', 'bon_caisse_id'
  ];
  v_old jsonb;
  v_new jsonb;
  v_locked_old boolean := false;
  v_locked_new boolean := false;
BEGIN
  -- Contexte serveur (service role, SQL Editor) : chemin de confiance.
  IF auth.uid() IS NULL THEN
    RETURN COALESCE(NEW, OLD);
  END IF;

  IF TG_OP IN ('UPDATE', 'DELETE') THEN
    v_locked_old := public.compta_mois_cloture(OLD.date::date);
  END IF;
  IF TG_OP IN ('INSERT', 'UPDATE') THEN
    v_locked_new := public.compta_mois_cloture(NEW.date::date);
  END IF;

  IF TG_OP = 'INSERT' THEN
    IF v_locked_new THEN
      RAISE EXCEPTION 'Le mois du % est clôturé : datez l''écriture dans une période ouverte.',
        to_char(NEW.date::date, 'DD/MM/YYYY') USING ERRCODE = '42501';
    END IF;
    RETURN NEW;
  END IF;

  IF TG_OP = 'DELETE' THEN
    IF v_locked_old THEN
      RAISE EXCEPTION 'Le mois du % est clôturé : cette écriture ne peut plus être supprimée.',
        to_char(OLD.date::date, 'DD/MM/YYYY') USING ERRCODE = '42501';
    END IF;
    RETURN OLD;
  END IF;

  IF NOT (v_locked_old OR v_locked_new) THEN
    RETURN NEW;
  END IF;

  v_old := to_jsonb(OLD) - 'updated_at';
  v_new := to_jsonb(NEW) - 'updated_at';
  IF v_new = v_old THEN
    RETURN NEW; -- mise à jour sans effet (ex. resynchronisation d'un bulletin inchangé)
  END IF;

  -- Action d'une clé étrangère (compte supprimé → SET NULL) : autorisée.
  IF pg_trigger_depth() > 1 AND NOT EXISTS (
    SELECT 1 FROM jsonb_object_keys(v_new) AS k
    WHERE v_new -> k IS DISTINCT FROM v_old -> k
      AND NOT (k = ANY (v_refs) AND v_new -> k = 'null'::jsonb)
  ) THEN
    RETURN NEW;
  END IF;

  RAISE EXCEPTION 'Période clôturée : cette écriture est figée. Passez une écriture de régularisation dans le mois en cours.'
    USING ERRCODE = '42501';
END;
$$;

DROP TRIGGER IF EXISTS entrees_periode_verrou_biud ON public.entrees_comptables;
CREATE TRIGGER entrees_periode_verrou_biud
BEFORE INSERT OR UPDATE OR DELETE ON public.entrees_comptables
FOR EACH ROW EXECUTE FUNCTION public.trg_compta_periode_verrou();

DROP TRIGGER IF EXISTS sorties_periode_verrou_biud ON public.sorties_comptables;
CREATE TRIGGER sorties_periode_verrou_biud
BEFORE INSERT OR UPDATE OR DELETE ON public.sorties_comptables
FOR EACH ROW EXECUTE FUNCTION public.trg_compta_periode_verrou();

-- ================================================================
-- 5) Budgets mensuels par catégorie
-- ================================================================
CREATE TABLE IF NOT EXISTS public.compta_budgets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  categorie text NOT NULL CHECK (char_length(btrim(categorie)) > 0),
  devise text NOT NULL DEFAULT 'FCFA' CHECK (devise IN ('FCFA', 'USD')),
  montant_mensuel numeric NOT NULL CHECK (montant_mensuel > 0),
  actif boolean NOT NULL DEFAULT true,
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (categorie, devise)
);

-- Dépensé sur un mois dans une catégorie : sorties validées datées du mois
-- + (FCFA) avances approuvées ce mois-là et pas encore clôturées. Une avance
-- clôturée devient une sortie validée, comptée à sa date.
CREATE OR REPLACE FUNCTION public.compta_consommation(p_categorie text, p_devise text, p_mois date)
RETURNS numeric
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT (COALESCE((SELECT SUM(montant) FROM public.sorties_comptables
                    WHERE categorie = p_categorie AND devise = p_devise AND status = 'validated'
                      AND date >= date_trunc('month', p_mois)::date
                      AND date < (date_trunc('month', p_mois) + interval '1 month')::date), 0)::numeric
        + CASE WHEN p_devise = 'FCFA'
               THEN COALESCE((SELECT SUM(montant) FROM public.bons_caisse
                              WHERE categorie = p_categorie
                                AND status IN ('approuve', 'remis', 'justifie')
                                AND decision_at IS NOT NULL
                                AND public.compta_mois_de(decision_at) = date_trunc('month', p_mois)::date), 0)
               ELSE 0 END)::numeric
$$;

REVOKE EXECUTE ON FUNCTION public.compta_consommation(text, text, date) FROM PUBLIC, anon, authenticated;

-- Consommation du mois par catégorie budgétée, pour l'écran des budgets.
CREATE OR REPLACE FUNCTION public.compta_budgets_suivi(p_mois date)
RETURNS TABLE (categorie text, devise text, montant_mensuel numeric, actif boolean, consomme numeric)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
#variable_conflict use_column
BEGIN
  IF NOT (public.compta_has_permission('accounting.view')
          OR COALESCE(public.compta_current_role(), '') IN ('admin', 'super_admin')) THEN
    RAISE EXCEPTION 'Accès refusé.' USING ERRCODE = '42501';
  END IF;
  RETURN QUERY
  SELECT b.categorie, b.devise, b.montant_mensuel, b.actif,
         public.compta_consommation(b.categorie, b.devise, p_mois)
  FROM public.compta_budgets b
  ORDER BY b.devise, b.categorie;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.compta_budgets_suivi(date) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.compta_budgets_suivi(date) TO authenticated;

-- ================================================================
-- 6) Grille des transports
-- ================================================================
CREATE TABLE IF NOT EXISTS public.compta_grille_transport (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  -- « Bureau → Ambassade de Chine (Bastos) »
  trajet text NOT NULL UNIQUE CHECK (char_length(btrim(trajet)) >= 3),
  -- Tarif maximal pour UN trajet simple.
  montant_max numeric NOT NULL CHECK (montant_max > 0),
  actif boolean NOT NULL DEFAULT true,
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Trajet choisi à la demande (les corrections d'une demande ne le changent pas :
-- on annule et on redemande). Le plafond est vérifié à l'approbation.
ALTER TABLE public.bons_caisse
  ADD COLUMN IF NOT EXISTS trajet_id uuid REFERENCES public.compta_grille_transport(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS nb_trajets integer NOT NULL DEFAULT 1 CHECK (nb_trajets BETWEEN 1 AND 20);

-- ================================================================
-- 7) Droits sur les paramètres, budgets et grille
-- ================================================================
DO $$
DECLARE
  t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['compta_budgets', 'compta_grille_transport'] LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
    -- On désactive plutôt que de supprimer : l'historique reste lisible.
    EXECUTE format('REVOKE DELETE, TRUNCATE ON public.%I FROM anon, authenticated', t);
    EXECUTE format('GRANT SELECT, INSERT, UPDATE ON public.%I TO authenticated', t);
    EXECUTE format('DROP POLICY IF EXISTS "%s_select" ON public.%I', t, t);
    EXECUTE format('DROP POLICY IF EXISTS "%s_insert" ON public.%I', t, t);
    EXECUTE format('DROP POLICY IF EXISTS "%s_update" ON public.%I', t, t);
    -- Lecture : tout le personnel (l'app agent affiche la grille à la demande).
    EXECUTE format($p$CREATE POLICY "%s_select" ON public.%I FOR SELECT TO authenticated
      USING ((SELECT public.compta_current_role()) IN ('agent', 'supervisor', 'admin', 'super_admin'))$p$, t, t);
    EXECUTE format($p$CREATE POLICY "%s_insert" ON public.%I FOR INSERT TO authenticated
      WITH CHECK ((SELECT public.compta_current_role()) IN ('admin', 'super_admin'))$p$, t, t);
    EXECUTE format($p$CREATE POLICY "%s_update" ON public.%I FOR UPDATE TO authenticated
      USING ((SELECT public.compta_current_role()) IN ('admin', 'super_admin'))
      WITH CHECK ((SELECT public.compta_current_role()) IN ('admin', 'super_admin'))$p$, t, t);
    EXECUTE format('DROP TRIGGER IF EXISTS %I ON public.%I', t || '_audit_aiud', t);
    EXECUTE format('CREATE TRIGGER %I AFTER INSERT OR UPDATE OR DELETE ON public.%I
      FOR EACH ROW EXECUTE FUNCTION public.trg_comptabilite_audit()', t || '_audit_aiud', t);
  END LOOP;
END $$;

-- La phase 2 ne traçait que les UPDATE des paramètres.
DROP TRIGGER IF EXISTS compta_parametres_audit_aiud ON public.compta_parametres;
CREATE TRIGGER compta_parametres_audit_aiud
AFTER INSERT OR UPDATE OR DELETE ON public.compta_parametres
FOR EACH ROW EXECUTE FUNCTION public.trg_comptabilite_audit();

-- ================================================================
-- 8) Plafonds : budget et grille → décision administrateur
-- ================================================================
-- Sortie : au moment de la valider.
CREATE OR REPLACE FUNCTION public.trg_sorties_plafonds()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_budget numeric;
  v_conso numeric;
BEGIN
  IF auth.uid() IS NULL OR pg_trigger_depth() > 1 THEN
    RETURN NEW;
  END IF;
  IF NOT (OLD.status = 'pending' AND NEW.status = 'validated') THEN
    RETURN NEW;
  END IF;
  IF COALESCE(public.compta_current_role(), '') IN ('admin', 'super_admin') THEN
    RETURN NEW;
  END IF;

  SELECT montant_mensuel INTO v_budget
  FROM public.compta_budgets
  WHERE categorie = OLD.categorie AND devise = OLD.devise AND actif;
  IF FOUND THEN
    v_conso := public.compta_consommation(OLD.categorie, OLD.devise, OLD.date::date);
    IF v_conso + OLD.montant > v_budget THEN
      RAISE EXCEPTION 'Budget « % » dépassé (% sur % % ce mois-ci) : la validation revient à un administrateur.',
        OLD.categorie, v_conso + OLD.montant, v_budget, OLD.devise USING ERRCODE = '42501';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS sorties_plafonds_bu ON public.sorties_comptables;
CREATE TRIGGER sorties_plafonds_bu
BEFORE UPDATE ON public.sorties_comptables
FOR EACH ROW EXECUTE FUNCTION public.trg_sorties_plafonds();

-- Bon de caisse : au moment de l'approuver.
CREATE OR REPLACE FUNCTION public.trg_bons_caisse_plafonds()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_trajet public.compta_grille_transport%ROWTYPE;
  v_budget numeric;
  v_conso numeric;
BEGIN
  IF auth.uid() IS NULL OR pg_trigger_depth() > 1 THEN
    RETURN NEW;
  END IF;
  IF NOT (OLD.status = 'demande' AND NEW.status = 'approuve') THEN
    RETURN NEW;
  END IF;
  IF COALESCE(public.compta_current_role(), '') IN ('admin', 'super_admin') THEN
    RETURN NEW;
  END IF;

  IF OLD.categorie = 'transports'
     AND EXISTS (SELECT 1 FROM public.compta_grille_transport WHERE actif) THEN
    SELECT * INTO v_trajet FROM public.compta_grille_transport WHERE id = OLD.trajet_id AND actif;
    IF NOT FOUND THEN
      RAISE EXCEPTION 'Course hors grille des transports : la décision revient à un administrateur.'
        USING ERRCODE = '42501';
    END IF;
    IF OLD.montant > v_trajet.montant_max * OLD.nb_trajets THEN
      RAISE EXCEPTION 'Montant au-dessus de la grille (% F au plus pour % × « % ») : la décision revient à un administrateur.',
        v_trajet.montant_max * OLD.nb_trajets, OLD.nb_trajets, v_trajet.trajet USING ERRCODE = '42501';
    END IF;
  END IF;

  SELECT montant_mensuel INTO v_budget
  FROM public.compta_budgets
  WHERE categorie = OLD.categorie AND devise = 'FCFA' AND actif;
  IF FOUND THEN
    v_conso := public.compta_consommation(OLD.categorie, 'FCFA', public.compta_mois_de(now()));
    IF v_conso + OLD.montant > v_budget THEN
      RAISE EXCEPTION 'Budget « % » dépassé (% sur % F ce mois-ci) : la décision revient à un administrateur.',
        OLD.categorie, v_conso + OLD.montant, v_budget USING ERRCODE = '42501';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS bons_caisse_plafonds_bu ON public.bons_caisse;
CREATE TRIGGER bons_caisse_plafonds_bu
BEFORE UPDATE ON public.bons_caisse
FOR EACH ROW EXECUTE FUNCTION public.trg_bons_caisse_plafonds();

-- ================================================================
-- 9) Rapport d'anomalies
-- ================================================================
-- Signaux à examiner, pas des accusations : chaque ligne dit ce qui a été vu
-- et où le vérifier. Les règles « en cours » (avance en retard, sortie qui
-- traîne, pas d'arrêté récent, solde divergent) ignorent la période.
-- Chaque colonne est castée : RETURN QUERY exige les types exacts, et les
-- tables d'origine (créées hors dépôt) peuvent utiliser varchar ou integer.
CREATE OR REPLACE FUNCTION public.compta_anomalies(p_debut date, p_fin date)
RETURNS TABLE (
  code text,
  gravite text,          -- 'haute' | 'moyenne' | 'basse'
  titre text,
  detail text,
  montant numeric,
  devise text,
  personne text,
  ref_table text,
  ref_id uuid,
  survenu_at timestamptz
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
#variable_conflict use_column
DECLARE
  v_params public.compta_parametres%ROWTYPE;
  v_debut_ts timestamptz := (p_debut::timestamp AT TIME ZONE 'Africa/Douala');
  v_fin_ts timestamptz := ((p_fin + 1)::timestamp AT TIME ZONE 'Africa/Douala');
  v_dernier timestamptz;
  v_cache numeric;
  v_calcul numeric;
  v_devise text;
BEGIN
  IF NOT (public.compta_has_permission('accounting.view')
          OR COALESCE(public.compta_current_role(), '') IN ('admin', 'super_admin')) THEN
    RAISE EXCEPTION 'Accès refusé.' USING ERRCODE = '42501';
  END IF;
  IF p_debut IS NULL OR p_fin IS NULL OR p_fin < p_debut THEN
    RAISE EXCEPTION 'Période invalide.';
  END IF;
  SELECT * INTO v_params FROM public.compta_parametres LIMIT 1;

  -- 1. Fractionnement : plusieurs petites sommes le même jour pour la même
  --    personne, chacune sous le seuil d'approbation admin, ensemble au-dessus.
  RETURN QUERY
  WITH ops AS (
    SELECT COALESCE(s.beneficiaire_id::text, lower(btrim(s.beneficiaire_nom::text))) AS cle,
           COALESCE(s.beneficiaire_nom::text, u.name::text) AS nom,
           s.date::date AS jour,
           s.montant::numeric AS mt
    FROM public.sorties_comptables s
    LEFT JOIN public.users u ON u.id = s.beneficiaire_id
    WHERE s.devise = 'FCFA' AND s.status IN ('pending', 'validated')
      AND s.payslip_id IS NULL AND s.bon_caisse_id IS NULL
      AND COALESCE(s.beneficiaire_id::text, NULLIF(btrim(s.beneficiaire_nom::text), '')) IS NOT NULL
      AND s.date::date BETWEEN p_debut AND p_fin
    UNION ALL
    SELECT COALESCE(b.demandeur_id::text, lower(btrim(b.demandeur_nom))), b.demandeur_nom,
           (b.created_at AT TIME ZONE 'Africa/Douala')::date, b.montant
    FROM public.bons_caisse b
    WHERE b.status NOT IN ('refuse', 'annule')
      AND b.created_at >= v_debut_ts AND b.created_at < v_fin_ts
  )
  SELECT 'fractionnement'::text, 'haute'::text,
         'Dépenses fractionnées sous le seuil'::text,
         format('%s opérations le %s (%s), chacune sous %s F',
                count(*), to_char(o.jour, 'DD/MM/YYYY'),
                string_agg(o.mt::text || ' F', ' + ' ORDER BY o.mt DESC),
                v_params.seuil_approbation_admin),
         SUM(o.mt), 'FCFA'::text, max(o.nom), NULL::text, NULL::uuid,
         (o.jour::timestamp AT TIME ZONE 'Africa/Douala')
  FROM ops o
  GROUP BY o.cle, o.jour
  HAVING count(*) >= 2
     AND max(o.mt) < v_params.seuil_approbation_admin
     AND SUM(o.mt) >= v_params.seuil_approbation_admin;

  -- 2. Avances non justifiées dans le délai (en cours).
  RETURN QUERY
  SELECT 'avance_en_retard'::text, 'haute'::text,
         'Avance non justifiée dans le délai'::text,
         format('BC-%s — %s — échéance dépassée depuis le %s',
                lpad(b.numero::text, 6, '0'), b.motif,
                to_char(b.echeance_justification AT TIME ZONE 'Africa/Douala', 'DD/MM/YYYY HH24:MI')),
         b.montant, 'FCFA'::text, b.demandeur_nom, 'bons_caisse'::text, b.id, b.echeance_justification
  FROM public.bons_caisse b
  WHERE b.status = 'remis' AND b.echeance_justification < now();

  -- 3. Encaissement validé sans (ou avec moins d') écriture d'entrée : de
  --    l'argent reçu qui n'apparaît pas dans le livre.
  BEGIN
    RETURN QUERY
    SELECT 'encaissement_non_comptabilise'::text, 'haute'::text,
           'Paiement encaissé absent du livre'::text,
           format('Encaissé %s, comptabilisé %s', p.montant_paye, COALESCE(e.total, 0)),
           (p.montant_paye - COALESCE(e.total, 0))::numeric, NULL::text,
           NULLIF(btrim(COALESCE(st.nom::text, '') || ' ' || COALESCE(st.prenom::text, '')), ''),
           'payments'::text, p.id, p.validated_at::timestamptz
    FROM public.payments p
    LEFT JOIN (SELECT en.payment_id, SUM(en.montant)::numeric AS total
               FROM public.entrees_comptables en
               WHERE en.payment_id IS NOT NULL
               GROUP BY en.payment_id) e ON e.payment_id = p.id
    LEFT JOIN public.students st ON st.id = p.student_id
    WHERE COALESCE(p.montant_paye, 0) > 0
      AND p.validated_at >= v_debut_ts AND p.validated_at < v_fin_ts
      AND COALESCE(e.total, 0) < p.montant_paye - 0.5;
  EXCEPTION WHEN undefined_column OR undefined_table THEN
    NULL; -- schéma des paiements plus ancien : règle ignorée
  END;

  -- 4. Entrées supprimées (l'argent reçu disparaît du livre).
  RETURN QUERY
  SELECT 'entree_supprimee'::text,
         (CASE WHEN a.actor_id IS NULL THEN 'moyenne' ELSE 'haute' END)::text,
         'Entrée supprimée'::text,
         format('%s — datée du %s%s',
                COALESCE(a.old_data ->> 'description', ''), COALESCE(a.old_data ->> 'date', '?'),
                CASE WHEN a.actor_id IS NULL
                     THEN ' (par le serveur : annulation de la validation d''un paiement ?)' ELSE '' END),
         NULLIF(a.old_data ->> 'montant', '')::numeric, a.old_data ->> 'devise',
         a.actor_name, 'entrees_comptables'::text, a.record_id, a.created_at
  FROM public.comptabilite_audit a
  WHERE a.table_name = 'entrees_comptables' AND a.operation = 'DELETE'
    AND a.created_at >= v_debut_ts AND a.created_at < v_fin_ts;

  -- 5. Entrées modifiées après coup (montant, date ou devise).
  RETURN QUERY
  SELECT 'entree_modifiee'::text, 'haute'::text,
         'Entrée modifiée après saisie'::text,
         format('%s : %s %s → %s %s, date %s → %s',
                COALESCE(a.new_data ->> 'description', ''),
                a.old_data ->> 'montant', a.old_data ->> 'devise',
                a.new_data ->> 'montant', a.new_data ->> 'devise',
                a.old_data ->> 'date', a.new_data ->> 'date'),
         NULLIF(a.new_data ->> 'montant', '')::numeric - NULLIF(a.old_data ->> 'montant', '')::numeric,
         a.new_data ->> 'devise', a.actor_name, 'entrees_comptables'::text, a.record_id, a.created_at
  FROM public.comptabilite_audit a
  WHERE a.table_name = 'entrees_comptables' AND a.operation = 'UPDATE'
    AND a.changed_fields && ARRAY['montant', 'date', 'devise']::text[]
    AND a.created_at >= v_debut_ts AND a.created_at < v_fin_ts;

  -- 6. Sorties annulées après validation.
  RETURN QUERY
  SELECT 'sortie_annulee'::text, 'moyenne'::text,
         'Sortie annulée après validation'::text,
         format('%s — motif : %s', s.description, COALESCE(s.cancellation_reason, '')),
         s.montant::numeric, s.devise::text, COALESCE(uc.name::text, 'Compte supprimé'),
         'sorties_comptables'::text, s.id, s.cancelled_at::timestamptz
  FROM public.sorties_comptables s
  LEFT JOIN public.users uc ON uc.id = s.cancelled_by
  WHERE s.status = 'cancelled' AND s.validated_at IS NOT NULL
    AND s.cancelled_at >= v_debut_ts AND s.cancelled_at < v_fin_ts;

  -- 7. Sorties en attente depuis trop longtemps (en cours).
  RETURN QUERY
  SELECT 'sortie_en_attente'::text, 'moyenne'::text,
         'Sortie en attente depuis longtemps'::text,
         format('%s — saisie le %s%s', s.description,
                to_char(s.created_at::timestamptz AT TIME ZONE 'Africa/Douala', 'DD/MM/YYYY'),
                CASE WHEN s.justificatif_path IS NULL THEN ', sans justificatif' ELSE '' END),
         s.montant::numeric, s.devise::text, COALESCE(s.beneficiaire_nom::text, uc.name::text),
         'sorties_comptables'::text, s.id, s.created_at::timestamptz
  FROM public.sorties_comptables s
  LEFT JOIN public.users uc ON uc.id = s.created_by
  WHERE s.status = 'pending'
    AND s.created_at < now() - make_interval(days => v_params.delai_sortie_attente_jours);

  -- 8. Écarts de caisse constatés.
  RETURN QUERY
  SELECT 'ecart_caisse'::text,
         (CASE WHEN ar.ecart < 0 OR ar.status = 'conteste' THEN 'haute' ELSE 'moyenne' END)::text,
         (CASE WHEN ar.ecart < 0 THEN 'Manquant de caisse' ELSE 'Excédent de caisse' END)::text,
         format('Arrêté n° %s (%s) — %s', ar.numero,
                CASE ar.status WHEN 'valide' THEN 'validé' WHEN 'conteste' THEN 'contesté' ELSE 'à contrôler' END,
                COALESCE(ar.explication, '')),
         ar.ecart, ar.devise, ar.compte_par_nom, 'compta_arretes'::text, ar.id, ar.created_at
  FROM public.compta_arretes ar
  WHERE ar.ecart <> 0
    AND ar.created_at >= v_debut_ts AND ar.created_at < v_fin_ts;

  -- 9. Pas d'arrêté de caisse récent (en cours).
  SELECT max(ar.created_at) INTO v_dernier
  FROM public.compta_arretes ar WHERE ar.devise = 'FCFA' AND ar.status <> 'conteste';
  IF v_dernier IS NULL OR v_dernier < now() - make_interval(days => v_params.frequence_arrete_jours) THEN
    RETURN QUERY SELECT 'arrete_manquant'::text, 'moyenne'::text,
      'Caisse non comptée récemment'::text,
      (CASE WHEN v_dernier IS NULL THEN 'Aucun arrêté de caisse enregistré.'
            ELSE format('Dernier arrêté le %s (attendu au moins tous les %s jours).',
                        to_char(v_dernier AT TIME ZONE 'Africa/Douala', 'DD/MM/YYYY'),
                        v_params.frequence_arrete_jours) END)::text,
      NULL::numeric, 'FCFA'::text, NULL::text, NULL::text, NULL::uuid, COALESCE(v_dernier, now());
  END IF;

  -- 10. Budgets dépassés, mois par mois sur la période.
  RETURN QUERY
  SELECT 'depassement_budget'::text, 'moyenne'::text,
         'Budget dépassé'::text,
         format('%s — %s : %s dépensés pour un budget de %s',
                x.categorie, to_char(x.mois, 'MM/YYYY'), x.conso, x.montant_mensuel),
         x.conso - x.montant_mensuel, x.devise, NULL::text, 'compta_budgets'::text, x.id,
         (x.mois::timestamp AT TIME ZONE 'Africa/Douala')
  FROM (
    SELECT bu.id, bu.categorie, bu.devise, bu.montant_mensuel, m.mois::date AS mois,
           public.compta_consommation(bu.categorie, bu.devise, m.mois::date) AS conso
    FROM public.compta_budgets bu
    CROSS JOIN generate_series(date_trunc('month', p_debut::timestamp),
                               date_trunc('month', p_fin::timestamp),
                               interval '1 month') AS m(mois)
    WHERE bu.actif
  ) x
  WHERE x.conso > x.montant_mensuel;

  -- 11. Transports hors grille ou au-dessus du tarif.
  IF EXISTS (SELECT 1 FROM public.compta_grille_transport gt WHERE gt.actif) THEN
    RETURN QUERY
    SELECT 'transport_hors_grille'::text, 'moyenne'::text,
           (CASE WHEN g.id IS NULL THEN 'Transport hors grille' ELSE 'Transport au-dessus de la grille' END)::text,
           format('BC-%s — %s%s', lpad(b.numero::text, 6, '0'), b.motif,
                  CASE WHEN g.id IS NULL THEN ''
                       ELSE format(' (grille : %s × %s F)', b.nb_trajets, g.montant_max) END),
           b.montant, 'FCFA'::text, b.demandeur_nom, 'bons_caisse'::text, b.id, b.created_at
    FROM public.bons_caisse b
    LEFT JOIN public.compta_grille_transport g ON g.id = b.trajet_id AND g.actif
    WHERE b.categorie = 'transports'
      AND b.status NOT IN ('refuse', 'annule')
      AND b.created_at >= v_debut_ts AND b.created_at < v_fin_ts
      AND (g.id IS NULL OR b.montant > g.montant_max * b.nb_trajets);
  END IF;

  -- 12. Justifications d'avance rejetées.
  RETURN QUERY
  SELECT 'justification_rejetee'::text, 'moyenne'::text,
         'Justification d''avance rejetée'::text,
         format('BC-%s — motif : %s', lpad(a.new_data ->> 'numero', 6, '0'),
                COALESCE(a.new_data ->> 'rejet_justification_motif', '')),
         NULLIF(a.new_data ->> 'montant', '')::numeric, 'FCFA'::text, a.new_data ->> 'demandeur_nom',
         'bons_caisse'::text, a.record_id, a.created_at
  FROM public.comptabilite_audit a
  WHERE a.table_name = 'bons_caisse' AND a.operation = 'UPDATE'
    AND a.old_data ->> 'status' = 'justifie' AND a.new_data ->> 'status' = 'remis'
    AND a.created_at >= v_debut_ts AND a.created_at < v_fin_ts;

  -- 13. Saisies à des heures inhabituelles (nuit, dimanche).
  RETURN QUERY
  SELECT 'saisie_hors_heures'::text, 'basse'::text,
         'Saisie à une heure inhabituelle'::text,
         format('%s — %s%s', x.libelle,
                to_char(x.at AT TIME ZONE 'Africa/Douala', 'DD/MM/YYYY HH24:MI'),
                CASE WHEN extract(isodow FROM x.at AT TIME ZONE 'Africa/Douala') = 7 THEN ' (dimanche)' ELSE '' END),
         x.mt, x.dev, x.nom, x.tbl, x.id, x.at
  FROM (
    SELECT 'Sortie : ' || s.description::text AS libelle, s.created_at::timestamptz AS at,
           s.montant::numeric AS mt, s.devise::text AS dev, u.name::text AS nom,
           'sorties_comptables'::text AS tbl, s.id
    FROM public.sorties_comptables s
    LEFT JOIN public.users u ON u.id = s.created_by
    WHERE s.payslip_id IS NULL AND s.bon_caisse_id IS NULL
    UNION ALL
    SELECT 'Bon de caisse : ' || b.motif, b.created_at, b.montant, 'FCFA', b.demandeur_nom, 'bons_caisse', b.id
    FROM public.bons_caisse b
  ) x
  WHERE x.at >= v_debut_ts AND x.at < v_fin_ts
    AND (extract(hour FROM x.at AT TIME ZONE 'Africa/Douala') < 6
         OR extract(hour FROM x.at AT TIME ZONE 'Africa/Douala') >= 21
         OR extract(isodow FROM x.at AT TIME ZONE 'Africa/Douala') = 7);

  -- 14. Solde affiché ≠ solde recalculé depuis les écritures (en cours).
  FOREACH v_devise IN ARRAY ARRAY['FCFA', 'USD'] LOOP
    v_cache := NULL;
    SELECT cs.solde INTO v_cache FROM public.comptabilite_solde cs WHERE cs.devise = v_devise;
    v_calcul := public.compta_solde_theorique(v_devise);
    IF v_cache IS NOT NULL AND abs(v_cache - v_calcul) > 0.5 THEN
      RETURN QUERY SELECT 'solde_divergent'::text, 'haute'::text,
        'Solde affiché différent des écritures'::text,
        format('Solde affiché %s, recalculé %s (%s). Réconciliez avec reconcile_comptabilite_solde().',
               v_cache, v_calcul, v_devise),
        (v_cache - v_calcul)::numeric, v_devise, NULL::text, NULL::text, NULL::uuid, now();
    END IF;
  END LOOP;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.compta_anomalies(date, date) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.compta_anomalies(date, date) TO authenticated;

-- ================================================================
-- Vérification
-- ================================================================
SELECT tablename, policyname, cmd
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN ('compta_arretes', 'compta_clotures', 'compta_budgets', 'compta_grille_transport')
ORDER BY tablename, policyname;

SELECT tgname, tgrelid::regclass AS table_name
FROM pg_trigger
WHERE NOT tgisinternal
  AND tgname IN ('entrees_periode_verrou_biud', 'sorties_periode_verrou_biud', 'sorties_plafonds_bu',
                 'bons_caisse_plafonds_bu', 'compta_arretes_controle_biud')
ORDER BY 2, 1;

-- Doit renvoyer false : les clients ne peuvent plus déplacer le solde.
SELECT has_function_privilege('authenticated', 'public.apply_comptabilite_solde_delta(numeric, text)', 'EXECUTE')
  AS clients_peuvent_ajuster_le_solde;
