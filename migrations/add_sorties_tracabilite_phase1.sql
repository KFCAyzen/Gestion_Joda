-- ================================================================
-- COMPTABILITÉ — Traçabilité des sorties d'argent (Phase 1)
-- ================================================================
-- À exécuter dans l'éditeur SQL Supabase. Idempotent (réexécutable).
--
-- Problème : une sortie d'argent était une simple ligne saisie après coup.
-- Rien n'obligeait à joindre une preuve ni à dire qui avait reçu l'argent ;
-- on pouvait valider sa propre sortie, modifier ou supprimer une sortie déjà
-- validée, et le journal d'activité était écrit par le navigateur. La RLS
-- « FOR ALL » laissait enfin quiconque pouvait créer une sortie la valider ou
-- la supprimer en appelant l'API directement.
--
-- Cette migration déplace les règles dans la base (seule vraie barrière) :
--   1. helper compta_has_permission() : miroir SQL de usePermissions pour les
--      permissions accounting.* (surcharge user_permissions → role_permissions
--      → défauts du code), avec rôle et statut actif lus dans public.users ;
--   2. sorties : bénéficiaire, justificatif (fichier privé), statut « annulée »
--      avec motif obligatoire ;
--   3. bucket privé `justificatifs-comptables` (lecture par lien signé) ;
--   4. trigger de contrôle du circuit des sorties :
--        - création toujours « en attente », créateur = compte connecté ;
--        - validation interdite au créateur et au bénéficiaire, et impossible
--          sans bénéficiaire ni justificatif réellement déposé ;
--        - sortie validée verrouillée : seule l'annulation (motif) reste possible ;
--        - rejet / annulation : motif obligatoire, états définitifs ;
--        - suppression interdite (on annule) ;
--   5. journal d'audit tenu par la base (ancienne ET nouvelle valeur), non
--      modifiable par les clients ;
--   6. RLS séparée par action (lecture / création / modification / suppression).
--
-- Chemins de confiance non bridés par le trigger :
--   - contexte serveur sans utilisateur (service role, SQL Editor) ;
--   - écritures faites par un autre trigger (bulletin de paie → sortie de
--     salaire, actions ON DELETE CASCADE / SET NULL des clés étrangères).
--
-- Les sorties « en attente » antérieures sans justificatif ni bénéficiaire ne
-- pourront être validées qu'une fois complétées (Livre comptable → détail).

-- ================================================================
-- 1) Helper de permission comptable (côté serveur)
-- ================================================================
CREATE OR REPLACE FUNCTION public.compta_has_permission(p_perm text)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_role text;
  v_active boolean;
  v_override boolean;
BEGIN
  IF v_uid IS NULL THEN
    RETURN false;
  END IF;

  -- Rôle et statut lus dans public.users (écriture réservée aux admins), pas
  -- dans le JWT : un compte désactivé perd l'accès immédiatement.
  SELECT role, COALESCE(is_active, true) INTO v_role, v_active
  FROM public.users
  WHERE id = v_uid;

  IF v_role IS NULL OR NOT v_active THEN
    RETURN false;
  END IF;

  -- Verrou anti-lockout, comme rolePermissions.roleHasPermission.
  IF v_role = 'super_admin' THEN
    RETURN true;
  END IF;

  -- Surcharge individuelle (accord OU refus explicite) : elle prime.
  SELECT granted INTO v_override
  FROM public.user_permissions
  WHERE user_id = v_uid AND permission = p_perm
  LIMIT 1;
  IF FOUND THEN
    RETURN COALESCE(v_override, false);
  END IF;

  -- Défauts du rôle éditables en base, si le rôle y est configuré.
  IF EXISTS (SELECT 1 FROM public.role_permissions WHERE role = v_role) THEN
    RETURN EXISTS (
      SELECT 1 FROM public.role_permissions
      WHERE role = v_role AND permission = p_perm AND granted = true
    );
  END IF;

  -- Défauts du code (DEFAULT_ROLE_PERMISSIONS) : accounting.* = admin.
  RETURN v_role = 'admin' AND p_perm LIKE 'accounting.%';
END;
$$;

GRANT EXECUTE ON FUNCTION public.compta_has_permission(text) TO authenticated;

-- ================================================================
-- 2) Colonnes de traçabilité sur les sorties
-- ================================================================
ALTER TABLE public.sorties_comptables
  -- Personne qui a reçu l'argent : compte de l'application…
  ADD COLUMN IF NOT EXISTS beneficiaire_id uuid REFERENCES public.users(id) ON DELETE SET NULL,
  -- …ou nom libre (fournisseur, bailleur, chauffeur). Rempli aussi comme
  -- instantané du nom quand beneficiaire_id est posé (survit à la suppression).
  ADD COLUMN IF NOT EXISTS beneficiaire_nom text,
  -- Chemin du fichier dans le bucket privé `justificatifs-comptables`.
  ADD COLUMN IF NOT EXISTS justificatif_path text,
  ADD COLUMN IF NOT EXISTS cancelled_by uuid REFERENCES public.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS cancelled_at timestamptz,
  ADD COLUMN IF NOT EXISTS cancellation_reason text;

ALTER TABLE public.sorties_comptables
  DROP CONSTRAINT IF EXISTS sorties_comptables_status_check;
ALTER TABLE public.sorties_comptables
  ADD CONSTRAINT sorties_comptables_status_check
  CHECK (status IN ('pending', 'validated', 'rejected', 'cancelled'));

ALTER TABLE public.sorties_comptables
  DROP CONSTRAINT IF EXISTS sorties_comptables_cancel_reason_check;
ALTER TABLE public.sorties_comptables
  ADD CONSTRAINT sorties_comptables_cancel_reason_check
  CHECK (status <> 'cancelled' OR NULLIF(btrim(cancellation_reason), '') IS NOT NULL);

CREATE INDEX IF NOT EXISTS idx_sorties_beneficiaire ON public.sorties_comptables(beneficiaire_id);
CREATE INDEX IF NOT EXISTS idx_sorties_created_by   ON public.sorties_comptables(created_by);

-- Le cache de solde (trg_sorties_comptables_solde) ne compte que les sorties
-- 'validated' : passer une sortie validée à 'cancelled' rend automatiquement
-- son montant à la trésorerie. Rien à changer de ce côté.

-- ================================================================
-- 3) Bucket privé des justificatifs
-- ================================================================
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'justificatifs-comptables',
  'justificatifs-comptables',
  false,
  10485760, -- 10 Mo
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif', 'application/pdf']
)
ON CONFLICT (id) DO UPDATE
SET public = false,
    file_size_limit = EXCLUDED.file_size_limit,
    allowed_mime_types = EXCLUDED.allowed_mime_types;

-- Dépôt : qui peut saisir ou compléter une sortie. Aucune policy UPDATE/DELETE :
-- une pièce déposée ne peut être ni remplacée ni effacée par un client.
DROP POLICY IF EXISTS "justificatifs_compta_insert" ON storage.objects;
CREATE POLICY "justificatifs_compta_insert" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'justificatifs-comptables'
    AND (
      (SELECT public.compta_has_permission('accounting.create'))
      OR (SELECT public.compta_has_permission('accounting.edit'))
    )
  );

-- Lecture (liens signés) : qui a accès au livre comptable.
DROP POLICY IF EXISTS "justificatifs_compta_select" ON storage.objects;
CREATE POLICY "justificatifs_compta_select" ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'justificatifs-comptables'
    AND (SELECT public.compta_has_permission('accounting.view'))
  );

-- ================================================================
-- 4) Contrôle du circuit des sorties
-- ================================================================
CREATE OR REPLACE FUNCTION public.trg_sorties_comptables_controle()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  -- Colonnes du circuit de validation : tout le reste est du « contenu ».
  v_workflow text[] := ARRAY[
    'status', 'validated_by', 'validated_at',
    'rejected_by', 'rejected_at', 'rejection_reason',
    'cancelled_by', 'cancelled_at', 'cancellation_reason', 'updated_at'
  ];
  v_content_changed boolean;
BEGIN
  -- Contexte serveur (service role, SQL Editor) : chemin de confiance. Un
  -- client anonyme n'arrive pas jusqu'ici, la RLS l'arrête.
  IF v_uid IS NULL THEN
    RETURN COALESCE(NEW, OLD);
  END IF;

  -- Écriture issue d'un autre trigger : sortie de salaire créée ou resynchronisée
  -- par son bulletin, ON DELETE CASCADE / SET NULL d'une clé étrangère.
  IF pg_trigger_depth() > 1 THEN
    RETURN COALESCE(NEW, OLD);
  END IF;

  -- ---------------------------------------------------------------- DELETE
  IF TG_OP = 'DELETE' THEN
    -- Filet : bulletin déjà supprimé → c'est sa cascade qui retire la sortie.
    IF OLD.payslip_id IS NOT NULL
       AND NOT EXISTS (SELECT 1 FROM public.payslips WHERE id = OLD.payslip_id) THEN
      RETURN OLD;
    END IF;
    RAISE EXCEPTION 'Suppression interdite : une sortie s''annule avec un motif et reste visible dans le livre.'
      USING ERRCODE = '42501';
  END IF;

  -- ---------------------------------------------------------------- INSERT
  IF TG_OP = 'INSERT' THEN
    IF NEW.payslip_id IS NOT NULL THEN
      RAISE EXCEPTION 'Une sortie de salaire est créée uniquement par son bulletin de paie.'
        USING ERRCODE = '42501';
    END IF;
    -- Le créateur est le compte connecté (sinon on pourrait saisir « au nom »
    -- d'un autre et valider ensuite sa propre dépense).
    NEW.created_by := v_uid;
    NEW.status := 'pending';
    NEW.validated_by := NULL;  NEW.validated_at := NULL;
    NEW.rejected_by := NULL;   NEW.rejected_at := NULL;   NEW.rejection_reason := NULL;
    NEW.cancelled_by := NULL;  NEW.cancelled_at := NULL;  NEW.cancellation_reason := NULL;
    IF NEW.beneficiaire_id IS NOT NULL AND NULLIF(btrim(NEW.beneficiaire_nom), '') IS NULL THEN
      SELECT name INTO NEW.beneficiaire_nom FROM public.users WHERE id = NEW.beneficiaire_id;
    END IF;
    RETURN NEW;
  END IF;

  -- ---------------------------------------------------------------- UPDATE
  IF NEW.id IS DISTINCT FROM OLD.id
     OR NEW.created_by IS DISTINCT FROM OLD.created_by
     OR NEW.created_at IS DISTINCT FROM OLD.created_at
     OR NEW.payslip_id IS DISTINCT FROM OLD.payslip_id THEN
    RAISE EXCEPTION 'L''identité d''une sortie (créateur, date de saisie, bulletin lié) ne se modifie pas.'
      USING ERRCODE = '42501';
  END IF;

  IF OLD.payslip_id IS NOT NULL THEN
    RAISE EXCEPTION 'Sortie liée à un bulletin de paie : modifiez ou supprimez le bulletin.'
      USING ERRCODE = '42501';
  END IF;

  IF OLD.status IN ('rejected', 'cancelled') THEN
    RAISE EXCEPTION 'Cette sortie est %, elle ne peut plus être modifiée.',
      CASE OLD.status WHEN 'rejected' THEN 'rejetée' ELSE 'annulée' END
      USING ERRCODE = '42501';
  END IF;

  v_content_changed := (to_jsonb(NEW) - v_workflow) IS DISTINCT FROM (to_jsonb(OLD) - v_workflow);

  -- Aucun changement d'état ne modifie le contenu en même temps : on ne valide
  -- (ni ne rejette, ni n'annule) que ce qui a été relu.
  IF NEW.status IS DISTINCT FROM OLD.status AND v_content_changed THEN
    RAISE EXCEPTION 'Changement d''état et modification du contenu doivent être faits séparément.'
      USING ERRCODE = '42501';
  END IF;

  -- Les colonnes du circuit ne se posent que par les transitions ci-dessous.
  NEW.validated_by := OLD.validated_by;  NEW.validated_at := OLD.validated_at;
  NEW.rejected_by := OLD.rejected_by;    NEW.rejected_at := OLD.rejected_at;
  NEW.cancelled_by := OLD.cancelled_by;  NEW.cancelled_at := OLD.cancelled_at;
  -- Chaque motif n'est accepté qu'avec la transition qui lui correspond.
  IF NEW.status IS DISTINCT FROM 'rejected' THEN
    NEW.rejection_reason := OLD.rejection_reason;
  END IF;
  IF NEW.status IS DISTINCT FROM 'cancelled' THEN
    NEW.cancellation_reason := OLD.cancellation_reason;
  END IF;

  -- Sortie validée : verrouillée, seule l'annulation reste possible.
  IF OLD.status = 'validated' THEN
    -- Mise à jour sans effet (double clic sur « Valider ») : on la laisse passer.
    IF NEW.status = 'validated' AND NOT v_content_changed THEN
      RETURN NEW;
    END IF;
    IF NEW.status = 'cancelled' THEN
      IF NOT public.compta_has_permission('accounting.delete') THEN
        RAISE EXCEPTION 'Vous n''avez pas le droit d''annuler une sortie validée.'
          USING ERRCODE = '42501';
      END IF;
      IF NULLIF(btrim(NEW.cancellation_reason), '') IS NULL THEN
        RAISE EXCEPTION 'Le motif d''annulation est obligatoire.';
      END IF;
      NEW.cancelled_by := v_uid;
      NEW.cancelled_at := now();
      RETURN NEW;
    END IF;
    RAISE EXCEPTION 'Sortie validée : elle est verrouillée. Pour la corriger, annulez-la avec un motif puis saisissez une nouvelle sortie.'
      USING ERRCODE = '42501';
  END IF;

  -- À partir d'ici : OLD.status = 'pending'.
  IF NEW.status = 'pending' THEN
    IF v_content_changed
       AND v_uid IS DISTINCT FROM OLD.created_by
       AND NOT public.compta_has_permission('accounting.edit') THEN
      RAISE EXCEPTION 'Seul l''auteur de la sortie ou un compte autorisé à modifier peut la compléter.'
        USING ERRCODE = '42501';
    END IF;
    IF NEW.beneficiaire_id IS DISTINCT FROM OLD.beneficiaire_id
       AND NEW.beneficiaire_id IS NOT NULL
       AND NEW.beneficiaire_nom IS NOT DISTINCT FROM OLD.beneficiaire_nom THEN
      SELECT name INTO NEW.beneficiaire_nom FROM public.users WHERE id = NEW.beneficiaire_id;
    END IF;
    RETURN NEW;
  END IF;

  IF NEW.status = 'validated' THEN
    IF NOT public.compta_has_permission('accounting.validate') THEN
      RAISE EXCEPTION 'Vous n''avez pas le droit de valider une sortie.' USING ERRCODE = '42501';
    END IF;
    IF v_uid = OLD.created_by THEN
      RAISE EXCEPTION 'Vous ne pouvez pas valider une sortie que vous avez saisie : un autre compte doit la contrôler.'
        USING ERRCODE = '42501';
    END IF;
    IF v_uid = OLD.beneficiaire_id THEN
      RAISE EXCEPTION 'Vous ne pouvez pas valider une sortie dont vous êtes le bénéficiaire.'
        USING ERRCODE = '42501';
    END IF;
    IF OLD.beneficiaire_id IS NULL AND NULLIF(btrim(OLD.beneficiaire_nom), '') IS NULL THEN
      RAISE EXCEPTION 'Indiquez qui a reçu l''argent avant de valider cette sortie.';
    END IF;
    IF OLD.justificatif_path IS NULL OR NOT EXISTS (
      SELECT 1 FROM storage.objects
      WHERE bucket_id = 'justificatifs-comptables' AND name = OLD.justificatif_path
    ) THEN
      RAISE EXCEPTION 'Justificatif manquant : joignez la pièce (reçu, facture, fiche de course) avant de valider.';
    END IF;
    NEW.validated_by := v_uid;
    NEW.validated_at := now();
    RETURN NEW;
  END IF;

  IF NEW.status = 'rejected' THEN
    IF NOT public.compta_has_permission('accounting.validate') THEN
      RAISE EXCEPTION 'Vous n''avez pas le droit de rejeter une sortie.' USING ERRCODE = '42501';
    END IF;
    IF NULLIF(btrim(NEW.rejection_reason), '') IS NULL THEN
      RAISE EXCEPTION 'Le motif du rejet est obligatoire.';
    END IF;
    NEW.rejected_by := v_uid;
    NEW.rejected_at := now();
    RETURN NEW;
  END IF;

  IF NEW.status = 'cancelled' THEN
    -- L'auteur peut retirer sa propre demande tant qu'elle n'est pas traitée.
    IF v_uid IS DISTINCT FROM OLD.created_by AND NOT public.compta_has_permission('accounting.delete') THEN
      RAISE EXCEPTION 'Vous n''avez pas le droit d''annuler cette sortie.' USING ERRCODE = '42501';
    END IF;
    IF NULLIF(btrim(NEW.cancellation_reason), '') IS NULL THEN
      RAISE EXCEPTION 'Le motif d''annulation est obligatoire.';
    END IF;
    NEW.cancelled_by := v_uid;
    NEW.cancelled_at := now();
    RETURN NEW;
  END IF;

  RAISE EXCEPTION 'Transition de statut non autorisée : % → %.', OLD.status, NEW.status;
END;
$$;

DROP TRIGGER IF EXISTS sorties_comptables_controle_biud ON public.sorties_comptables;
CREATE TRIGGER sorties_comptables_controle_biud
BEFORE INSERT OR UPDATE OR DELETE ON public.sorties_comptables
FOR EACH ROW EXECUTE FUNCTION public.trg_sorties_comptables_controle();

-- ================================================================
-- 5) Journal d'audit tenu par la base
-- ================================================================
CREATE TABLE IF NOT EXISTS public.comptabilite_audit (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  table_name text NOT NULL,
  record_id uuid NOT NULL,
  operation text NOT NULL CHECK (operation IN ('INSERT', 'UPDATE', 'DELETE')),
  changed_fields text[],
  old_data jsonb,
  new_data jsonb,
  -- Pas de clé étrangère : l'historique doit survivre à la suppression d'un compte.
  actor_id uuid,
  actor_name text,
  actor_role text,
  -- 'authenticated', 'service_role' (routes serveur) ou rôle Postgres (SQL Editor).
  db_role text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_compta_audit_record  ON public.comptabilite_audit(table_name, record_id, created_at);
CREATE INDEX IF NOT EXISTS idx_compta_audit_actor   ON public.comptabilite_audit(actor_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_compta_audit_created ON public.comptabilite_audit(created_at DESC);

CREATE OR REPLACE FUNCTION public.trg_comptabilite_audit()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_old jsonb := CASE WHEN TG_OP IN ('UPDATE', 'DELETE') THEN to_jsonb(OLD) END;
  v_new jsonb := CASE WHEN TG_OP IN ('INSERT', 'UPDATE') THEN to_jsonb(NEW) END;
  v_changed text[];
  v_uid uuid := auth.uid();
  v_name text;
  v_role text;
BEGIN
  IF TG_OP = 'UPDATE' THEN
    SELECT array_agg(k ORDER BY k) INTO v_changed
    FROM jsonb_object_keys(v_new) AS k
    WHERE v_new -> k IS DISTINCT FROM v_old -> k;
    IF v_changed IS NULL THEN
      RETURN NULL; -- UPDATE sans effet : rien à tracer
    END IF;
  END IF;

  IF v_uid IS NOT NULL THEN
    SELECT name, role INTO v_name, v_role FROM public.users WHERE id = v_uid;
  END IF;

  INSERT INTO public.comptabilite_audit (
    table_name, record_id, operation, changed_fields,
    old_data, new_data, actor_id, actor_name, actor_role, db_role
  ) VALUES (
    TG_TABLE_NAME,
    COALESCE(v_new ->> 'id', v_old ->> 'id')::uuid,
    TG_OP,
    v_changed,
    v_old,
    v_new,
    v_uid,
    v_name,
    v_role,
    COALESCE(auth.jwt() ->> 'role', session_user)
  );
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS sorties_comptables_audit_aiud ON public.sorties_comptables;
CREATE TRIGGER sorties_comptables_audit_aiud
AFTER INSERT OR UPDATE OR DELETE ON public.sorties_comptables
FOR EACH ROW EXECUTE FUNCTION public.trg_comptabilite_audit();

DROP TRIGGER IF EXISTS entrees_comptables_audit_aiud ON public.entrees_comptables;
CREATE TRIGGER entrees_comptables_audit_aiud
AFTER INSERT OR UPDATE OR DELETE ON public.entrees_comptables
FOR EACH ROW EXECUTE FUNCTION public.trg_comptabilite_audit();

-- Lecture seule pour les clients : seul le trigger (SECURITY DEFINER) écrit.
ALTER TABLE public.comptabilite_audit ENABLE ROW LEVEL SECURITY;
REVOKE INSERT, UPDATE, DELETE, TRUNCATE ON public.comptabilite_audit FROM anon, authenticated;
GRANT SELECT ON public.comptabilite_audit TO authenticated;

DROP POLICY IF EXISTS "compta_audit_select" ON public.comptabilite_audit;
CREATE POLICY "compta_audit_select" ON public.comptabilite_audit
  FOR SELECT TO authenticated
  USING ((SELECT public.compta_has_permission('accounting.view')));

-- ================================================================
-- 6) RLS séparée par action
-- ================================================================

-- sorties_comptables : on repart d'un état connu (toutes les policies
-- existantes, anciennes comprises, sont retirées puis recréées).
DO $$
DECLARE
  p record;
BEGIN
  FOR p IN
    SELECT policyname FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'sorties_comptables'
  LOOP
    EXECUTE format('DROP POLICY %I ON public.sorties_comptables', p.policyname);
  END LOOP;
END $$;

ALTER TABLE public.sorties_comptables ENABLE ROW LEVEL SECURITY;

CREATE POLICY "sorties_select" ON public.sorties_comptables
  FOR SELECT TO authenticated
  USING ((SELECT public.compta_has_permission('accounting.view')));

CREATE POLICY "sorties_insert" ON public.sorties_comptables
  FOR INSERT TO authenticated
  WITH CHECK ((SELECT public.compta_has_permission('accounting.create')));

-- Qui peut agir sur une sortie. Le détail (compléter, valider, rejeter,
-- annuler) est tranché par trg_sorties_comptables_controle.
CREATE POLICY "sorties_update" ON public.sorties_comptables
  FOR UPDATE TO authenticated
  USING (
    (SELECT public.compta_has_permission('accounting.create'))
    OR (SELECT public.compta_has_permission('accounting.edit'))
    OR (SELECT public.compta_has_permission('accounting.validate'))
    OR (SELECT public.compta_has_permission('accounting.delete'))
  )
  WITH CHECK (
    (SELECT public.compta_has_permission('accounting.create'))
    OR (SELECT public.compta_has_permission('accounting.edit'))
    OR (SELECT public.compta_has_permission('accounting.validate'))
    OR (SELECT public.compta_has_permission('accounting.delete'))
  );
-- Aucune policy DELETE : un client ne supprime jamais une sortie.

-- entrees_comptables : la validation d'un paiement (web et apps mobiles)
-- insère des entrées ; on garde donc la création au moins aussi ouverte
-- qu'avant. Modification et suppression passent par des policies RESTRICTIVES,
-- qui s'appliquent quelles que soient les autres policies présentes en base.
DROP POLICY IF EXISTS "entrees_accounting_write" ON public.entrees_comptables;
DROP POLICY IF EXISTS "entrees_insert"            ON public.entrees_comptables;
DROP POLICY IF EXISTS "entrees_update"            ON public.entrees_comptables;
DROP POLICY IF EXISTS "entrees_delete"            ON public.entrees_comptables;
DROP POLICY IF EXISTS "entrees_update_restrict"   ON public.entrees_comptables;
DROP POLICY IF EXISTS "entrees_delete_restrict"   ON public.entrees_comptables;

CREATE POLICY "entrees_insert" ON public.entrees_comptables
  FOR INSERT TO authenticated
  WITH CHECK (
    public.get_auth_user_role() IN ('admin', 'super_admin')
    OR public.has_granted_permission('accounting.create')
    OR (SELECT public.compta_has_permission('accounting.create'))
  );

CREATE POLICY "entrees_update" ON public.entrees_comptables
  FOR UPDATE TO authenticated
  USING ((SELECT public.compta_has_permission('accounting.edit')))
  WITH CHECK ((SELECT public.compta_has_permission('accounting.edit')));

CREATE POLICY "entrees_update_restrict" ON public.entrees_comptables
  AS RESTRICTIVE
  FOR UPDATE TO authenticated
  USING ((SELECT public.compta_has_permission('accounting.edit')))
  WITH CHECK ((SELECT public.compta_has_permission('accounting.edit')));

CREATE POLICY "entrees_delete" ON public.entrees_comptables
  FOR DELETE TO authenticated
  USING ((SELECT public.compta_has_permission('accounting.delete')));

CREATE POLICY "entrees_delete_restrict" ON public.entrees_comptables
  AS RESTRICTIVE
  FOR DELETE TO authenticated
  USING ((SELECT public.compta_has_permission('accounting.delete')));

-- TRUNCATE contourne triggers et RLS : aucun client n'en a besoin.
REVOKE TRUNCATE ON public.sorties_comptables, public.entrees_comptables FROM anon, authenticated;

-- ================================================================
-- Vérification
-- ================================================================
SELECT tablename, policyname, permissive, cmd
FROM pg_policies
WHERE (schemaname = 'public' AND tablename IN ('sorties_comptables', 'entrees_comptables', 'comptabilite_audit'))
   OR (schemaname = 'storage' AND policyname LIKE 'justificatifs_compta_%')
ORDER BY tablename, policyname;

SELECT tgname, tgrelid::regclass AS table_name
FROM pg_trigger
WHERE NOT tgisinternal
  AND tgrelid IN ('public.sorties_comptables'::regclass, 'public.entrees_comptables'::regclass)
ORDER BY 2, 1;
