-- Suppression d'un compte utilisateur — Joda Company
-- ----------------------------------------------------------------------------
-- Contexte : /api/delete-user échouait en prod avec
--   « update or delete on table "users" violates foreign key constraint
--     "messages_to_user_id_fkey" on table "messages" »
-- puis « Database error deleting user » côté Supabase Auth (même cause : le
-- DELETE sur auth.users cascade sur public.users, qui est bloqué par une FK).
--
-- Plusieurs tables référencent users(id) sans clause ON DELETE (NO ACTION par
-- défaut) : la suppression d'un compte est donc impossible dès qu'il a agi
-- une seule fois (validé un paiement, envoyé un message, reçu une notif…).
--
-- Cette migration ne liste pas les tables en dur : elle parcourt pg_constraint
-- et recrée chaque FK vers public.users / auth.users qui est encore en
-- NO ACTION / RESTRICT, avec l'action adaptée :
--   • données qui n'ont aucun sens sans le compte  → ON DELETE CASCADE
--     (messages, notifications, jetons de reset, permissions)
--   • colonnes de traçabilité (validated_by, created_by, user_id…) → SET NULL
--     (on garde l'historique métier, seul l'auteur devient inconnu)
--   • colonne NOT NULL non listée ci-dessus → CASCADE (seule option possible
--     sans modifier la colonne ; un RAISE NOTICE le signale)
--
-- Idempotente : une FK déjà en CASCADE / SET NULL n'est pas touchée.
-- À lancer manuellement dans l'éditeur SQL Supabase (voir l'onglet « Messages »
-- pour le détail des FK réécrites).

DO $$
DECLARE
  r            record;
  all_nullable boolean;
  cols         text;
  refcols      text;
  action       text;
  -- Tables dont les lignes n'ont aucune valeur sans leur utilisateur.
  cascade_tables text[] := ARRAY[
    'messages',
    'notifications',
    'password_reset_tokens',
    'user_permissions'
  ];
BEGIN
  FOR r IN
    SELECT c.oid,
           c.conname,
           c.conrelid,
           c.confrelid,
           c.conrelid::regclass  AS tbl,
           c.confrelid::regclass AS reftbl,
           cl.relname            AS tblname,
           c.conkey,
           c.confkey,
           c.confdeltype
      FROM pg_constraint c
      JOIN pg_class cl     ON cl.oid = c.conrelid
      JOIN pg_namespace n  ON n.oid = cl.relnamespace
     WHERE c.contype = 'f'
       AND n.nspname = 'public'
       AND c.confrelid IN ('public.users'::regclass, 'auth.users'::regclass)
       AND c.confdeltype IN ('a', 'r')          -- NO ACTION / RESTRICT
  LOOP
    SELECT bool_and(NOT a.attnotnull),
           string_agg(quote_ident(a.attname), ', ' ORDER BY k.ord)
      INTO all_nullable, cols
      FROM unnest(r.conkey) WITH ORDINALITY AS k(attnum, ord)
      JOIN pg_attribute a ON a.attrelid = r.conrelid AND a.attnum = k.attnum;

    SELECT string_agg(quote_ident(a.attname), ', ' ORDER BY k.ord)
      INTO refcols
      FROM unnest(r.confkey) WITH ORDINALITY AS k(attnum, ord)
      JOIN pg_attribute a ON a.attrelid = r.confrelid AND a.attnum = k.attnum;

    IF r.tblname = ANY (cascade_tables) THEN
      action := 'CASCADE';
    ELSIF all_nullable THEN
      action := 'SET NULL';
    ELSE
      action := 'CASCADE';
      RAISE NOTICE 'FK %.% : colonne NOT NULL hors liste -> CASCADE par defaut', r.tbl, cols;
    END IF;

    EXECUTE format('ALTER TABLE %s DROP CONSTRAINT %I', r.tbl, r.conname);
    EXECUTE format(
      'ALTER TABLE %s ADD CONSTRAINT %I FOREIGN KEY (%s) REFERENCES %s (%s) ON DELETE %s',
      r.tbl, r.conname, cols, r.reftbl, refcols, action
    );

    RAISE NOTICE 'FK % sur %(%) -> ON DELETE %', r.conname, r.tbl, cols, action;
  END LOOP;
END
$$;

-- Vérification : il ne doit plus rester de FK vers users sans action ON DELETE.
SELECT c.conrelid::regclass AS table_name,
       c.conname,
       CASE c.confdeltype
         WHEN 'a' THEN 'NO ACTION'
         WHEN 'r' THEN 'RESTRICT'
         WHEN 'c' THEN 'CASCADE'
         WHEN 'n' THEN 'SET NULL'
         WHEN 'd' THEN 'SET DEFAULT'
       END AS on_delete
  FROM pg_constraint c
  JOIN pg_class cl    ON cl.oid = c.conrelid
  JOIN pg_namespace n ON n.oid = cl.relnamespace
 WHERE c.contype = 'f'
   AND n.nspname = 'public'
   AND c.confrelid IN ('public.users'::regclass, 'auth.users'::regclass)
 ORDER BY 1, 2;
