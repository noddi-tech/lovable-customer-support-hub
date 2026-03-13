
-- Remove legacy broad policy that may still exist
DROP POLICY IF EXISTS "Authenticated users can manage typing indicators in their org" ON public.chat_typing_indicators;
