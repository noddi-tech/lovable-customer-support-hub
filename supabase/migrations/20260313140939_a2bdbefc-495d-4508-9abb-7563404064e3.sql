
-- 1) Fix FK: drop old FK to profiles.id, recreate to profiles.user_id
ALTER TABLE public.chat_typing_indicators
  DROP CONSTRAINT IF EXISTS chat_typing_indicators_user_id_fkey;

ALTER TABLE public.chat_typing_indicators
  ADD CONSTRAINT chat_typing_indicators_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES public.profiles(user_id) ON DELETE CASCADE;

-- 2) Add to realtime publication
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
    AND tablename = 'chat_typing_indicators'
    AND schemaname = 'public'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_typing_indicators;
  END IF;
END $$;

-- 3) Tighten RLS: drop broad policy, add granular ones
DROP POLICY IF EXISTS "Allow all operations on chat_typing_indicators" ON public.chat_typing_indicators;
DROP POLICY IF EXISTS "typing_select_org_members" ON public.chat_typing_indicators;
DROP POLICY IF EXISTS "typing_insert_own" ON public.chat_typing_indicators;
DROP POLICY IF EXISTS "typing_update_own" ON public.chat_typing_indicators;
DROP POLICY IF EXISTS "typing_delete_own" ON public.chat_typing_indicators;

-- SELECT: org members can see typing indicators for their org's conversations
CREATE POLICY "typing_select_org_members" ON public.chat_typing_indicators
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.conversations c
      JOIN public.organization_memberships om ON om.organization_id = c.organization_id
      WHERE c.id = chat_typing_indicators.conversation_id
        AND om.user_id = auth.uid()
        AND om.status = 'active'
    )
  );

-- INSERT: authenticated users can insert their own typing status
CREATE POLICY "typing_insert_own" ON public.chat_typing_indicators
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

-- UPDATE: authenticated users can update their own typing status
CREATE POLICY "typing_update_own" ON public.chat_typing_indicators
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- DELETE: authenticated users can delete their own typing status
CREATE POLICY "typing_delete_own" ON public.chat_typing_indicators
  FOR DELETE TO authenticated
  USING (user_id = auth.uid());
