
-- 1. Secure voicemails bucket
DROP POLICY IF EXISTS "Voicemails are publicly accessible" ON storage.objects;
DROP POLICY IF EXISTS "Service role can manage voicemails" ON storage.objects;
UPDATE storage.buckets SET public = false WHERE id = 'voicemails';

CREATE POLICY "Org members can read voicemails" ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'voicemails');

-- 2. Secure widget_chat_sessions
DROP POLICY IF EXISTS "Service role has full access to chat sessions" ON widget_chat_sessions;
DROP POLICY IF EXISTS "Authenticated users can view chat sessions in their org" ON widget_chat_sessions;
DROP POLICY IF EXISTS "Authenticated users can update chat sessions in their org" ON widget_chat_sessions;

CREATE POLICY "Authenticated users can view chat sessions in their org"
ON widget_chat_sessions FOR SELECT TO authenticated
USING (EXISTS (
  SELECT 1 FROM widget_configs wc
  JOIN organization_memberships om ON om.organization_id = wc.organization_id
  WHERE wc.id = widget_chat_sessions.widget_config_id
  AND om.user_id = auth.uid() AND om.status = 'active'
));

CREATE POLICY "Authenticated users can update chat sessions in their org"
ON widget_chat_sessions FOR UPDATE TO authenticated
USING (EXISTS (
  SELECT 1 FROM widget_configs wc
  JOIN organization_memberships om ON om.organization_id = wc.organization_id
  WHERE wc.id = widget_chat_sessions.widget_config_id
  AND om.user_id = auth.uid() AND om.status = 'active'
));

-- 3. Secure chat_typing_indicators
DROP POLICY IF EXISTS "Service role has full access to typing indicators" ON chat_typing_indicators;
DROP POLICY IF EXISTS "Authenticated users can view typing indicators in their org" ON chat_typing_indicators;
DROP POLICY IF EXISTS "Authenticated users can manage typing indicators in their org" ON chat_typing_indicators;

CREATE POLICY "Authenticated users can view typing indicators in their org"
ON chat_typing_indicators FOR SELECT TO authenticated
USING (EXISTS (
  SELECT 1 FROM conversations c
  JOIN organization_memberships om ON om.organization_id = c.organization_id
  WHERE c.id = chat_typing_indicators.conversation_id
  AND om.user_id = auth.uid() AND om.status = 'active'
));

CREATE POLICY "Authenticated users can manage typing indicators in their org"
ON chat_typing_indicators FOR ALL TO authenticated
USING (EXISTS (
  SELECT 1 FROM conversations c
  JOIN organization_memberships om ON om.organization_id = c.organization_id
  WHERE c.id = chat_typing_indicators.conversation_id
  AND om.user_id = auth.uid() AND om.status = 'active'
));
