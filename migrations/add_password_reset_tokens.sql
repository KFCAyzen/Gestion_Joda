-- ================================================================
-- Flux de réinitialisation par lien (remplace le mot de passe temporaire)
-- ================================================================
-- Motivation : l'ancien « mot de passe oublié » remplaçait immédiatement le mot de
-- passe par un temporaire, AVANT tout envoi. Un email non délivré (spam, rebond
-- iCloud) laissait l'utilisateur définitivement verrouillé : son mot de passe était
-- déjà détruit et le nouveau n'arrivait jamais. Pire, n'importe qui connaissant
-- l'email d'un membre de l'équipe pouvait invalider son accès sans être authentifié.
--
-- Avec un token, le mot de passe courant reste valide jusqu'à ce que l'utilisateur
-- aille au bout du parcours et choisisse lui-même son nouveau mot de passe.
--
-- On ne stocke que le SHA-256 du token : une fuite de la table ne permet pas de
-- reconstituer les liens en circulation.
-- ================================================================

CREATE TABLE IF NOT EXISTS public.password_reset_tokens (
    id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id    uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    token_hash text NOT NULL UNIQUE,
    expires_at timestamptz NOT NULL,
    used_at    timestamptz,
    created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_user
    ON public.password_reset_tokens (user_id);

-- Sert au nettoyage périodique des tokens expirés.
CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_expires
    ON public.password_reset_tokens (expires_at);

-- RLS activé SANS aucune policy : la table n'est accessible qu'au `service_role`,
-- qui contourne RLS. Aucun client authentifié ne doit pouvoir lire les hachages.
ALTER TABLE public.password_reset_tokens ENABLE ROW LEVEL SECURITY;

-- ── Vérification ────────────────────────────────────────────────────────────
-- Attendu : rowsecurity = true, et 0 policy.
SELECT
    c.relname,
    c.relrowsecurity                                     AS rls_active,
    (SELECT count(*) FROM pg_policies p
      WHERE p.schemaname = 'public' AND p.tablename = 'password_reset_tokens') AS nb_policies
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'public' AND c.relname = 'password_reset_tokens';
