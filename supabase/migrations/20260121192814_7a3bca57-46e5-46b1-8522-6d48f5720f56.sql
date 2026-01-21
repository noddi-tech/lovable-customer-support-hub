-- Fix RLS policies for widget_chat_sessions and chat_typing_indicators
-- Drop existing overly permissive policies

DROP POLICY IF EXISTS "Service role has full access to chat sessions" ON widget_chat_sessions;
DROP POLICY IF EXISTS "Service role has full access to typing indicators" ON chat_typing_indicators;

-- Create proper organization-scoped RLS policies for widget_chat_sessions
CREATE POLICY "Authenticated users can view chat sessions in their org"
ON widget_chat_sessions FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM widget_configs wc
    JOIN organization_memberships om ON om.organization_id = wc.organization_id
    WHERE wc.id = widget_chat_sessions.widget_config_id
    AND om.user_id = auth.uid()
    AND om.status = 'active'
  )
);

CREATE POLICY "Authenticated users can update chat sessions in their org"
ON widget_chat_sessions FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM widget_configs wc
    JOIN organization_memberships om ON om.organization_id = wc.organization_id
    WHERE wc.id = widget_chat_sessions.widget_config_id
    AND om.user_id = auth.uid()
    AND om.status = 'active'
  )
);

-- Create proper RLS policies for chat_typing_indicators
CREATE POLICY "Authenticated users can view typing indicators in their org"
ON chat_typing_indicators FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM conversations c
    JOIN organization_memberships om ON om.organization_id = c.organization_id
    WHERE c.id = chat_typing_indicators.conversation_id
    AND om.user_id = auth.uid()
    AND om.status = 'active'
  )
);

CREATE POLICY "Authenticated users can manage typing indicators in their org"
ON chat_typing_indicators FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM conversations c
    JOIN organization_memberships om ON om.organization_id = c.organization_id
    WHERE c.id = chat_typing_indicators.conversation_id
    AND om.user_id = auth.uid()
    AND om.status = 'active'
  )
);