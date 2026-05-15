-- Fix messages RLS for realtime messaging
--
-- Problems solved:
--   1. SELECT policy only allowed recipients to read — senders couldn't see their own messages
--   2. No INSERT policy — direct client inserts silently failed (students couldn't reply)

-- 1. Fix SELECT: allow both sender and recipient to read
DROP POLICY IF EXISTS messages_select_own ON public.messages;
CREATE POLICY messages_select_own
  ON public.messages
  FOR SELECT
  USING (auth.uid() = to_user_id OR auth.uid() = from_user_id);

-- 2. Add INSERT: authenticated users can only insert as themselves
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'messages' AND policyname = 'messages_insert_own'
  ) THEN
    CREATE POLICY messages_insert_own
      ON public.messages
      FOR INSERT
      WITH CHECK (auth.uid() = from_user_id);
  END IF;
END $$;
