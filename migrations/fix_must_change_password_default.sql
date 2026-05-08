-- ================================================================
-- FIX: must_change_password revient toujours à true
-- ================================================================
-- Ce script corrige la valeur par défaut de la colonne must_change_password
-- et crée un trigger pour empêcher qu'elle revienne à true après avoir été mise à false
-- ================================================================

-- 1. Modifier la valeur par défaut de la colonne must_change_password
ALTER TABLE public.users 
  ALTER COLUMN must_change_password SET DEFAULT false;

-- 2. Créer une fonction trigger pour protéger must_change_password
CREATE OR REPLACE FUNCTION protect_must_change_password()
RETURNS TRIGGER AS $$
BEGIN
  -- Si must_change_password était false, il ne peut pas revenir à true
  -- sauf si c'est un INSERT (nouveau compte)
  IF TG_OP = 'UPDATE' THEN
    IF OLD.must_change_password = false AND NEW.must_change_password = true THEN
      -- Empêcher le changement de false à true
      NEW.must_change_password = false;
      RAISE NOTICE 'must_change_password ne peut pas revenir à true pour l''utilisateur %', NEW.email;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 3. Créer le trigger
DROP TRIGGER IF EXISTS trigger_protect_must_change_password ON public.users;
CREATE TRIGGER trigger_protect_must_change_password
  BEFORE INSERT OR UPDATE ON public.users
  FOR EACH ROW
  EXECUTE FUNCTION protect_must_change_password();

-- 4. Mettre à jour les comptes admin/super_admin/agent existants
UPDATE public.users
SET must_change_password = false
WHERE role IN ('admin', 'super_admin', 'agent', 'supervisor');

-- 5. Vérification
SELECT 
  email,
  role,
  must_change_password
FROM public.users
WHERE email IN ('superadmin@joda.com', 'admin@joda.com', 'agent@joda.com')
ORDER BY role DESC;

-- 6. Afficher la nouvelle valeur par défaut
SELECT 
  column_name,
  column_default,
  is_nullable
FROM information_schema.columns
WHERE table_name = 'users' 
  AND column_name = 'must_change_password';

-- 7. Vérifier que le trigger est créé
SELECT 
  trigger_name,
  event_manipulation,
  action_timing
FROM information_schema.triggers
WHERE event_object_table = 'users'
  AND trigger_name = 'trigger_protect_must_change_password';
