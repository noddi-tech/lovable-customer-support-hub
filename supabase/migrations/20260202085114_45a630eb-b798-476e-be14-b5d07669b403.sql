-- Fix chat-attachments bucket security
-- Drop overly permissive policies that expose attachments across organizations

-- Drop existing overly permissive policies
DROP POLICY IF EXISTS "Users can view chat attachments" ON storage.objects;
DROP POLICY IF EXISTS "Anon users can view chat attachments" ON storage.objects;
DROP POLICY IF EXISTS "Agents can upload chat attachments" ON storage.objects;

-- Create properly scoped upload policy
-- Agents can only upload to paths prefixed with their organization's conversations
CREATE POLICY "Agents can upload to organization conversations"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'chat-attachments'
  AND (storage.foldername(name))[1] IN (
    SELECT c.id::text
    FROM conversations c
    JOIN organization_memberships om ON om.organization_id = c.organization_id
    WHERE om.user_id = auth.uid()
      AND om.status = 'active'
  )
);

-- Create properly scoped select policy for authenticated users
-- Users can only view attachments from conversations in their organization
CREATE POLICY "Users can view attachments from their organization"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'chat-attachments'
  AND (storage.foldername(name))[1] IN (
    SELECT c.id::text
    FROM conversations c
    JOIN organization_memberships om ON om.organization_id = c.organization_id
    WHERE om.user_id = auth.uid()
      AND om.status = 'active'
  )
);

-- For widget visitors (anon): they can only view attachments from their conversation
-- Attachments are uploaded with path: {conversation_id}/{filename}
-- Widget visitors have conversation_id in their session token
CREATE POLICY "Widget visitors can view their conversation attachments"
ON storage.objects FOR SELECT TO anon
USING (
  bucket_id = 'chat-attachments'
  AND (storage.foldername(name))[1] IN (
    -- Match conversation_id from widget session via JWT claim or cookie
    SELECT wcs.conversation_id::text
    FROM widget_chat_sessions wcs
    WHERE wcs.visitor_id = (
      current_setting('request.headers', true)::json->>'x-visitor-id'
    )
  )
);

-- Allow anonymous uploads for widget chat (visitors sending attachments)
CREATE POLICY "Widget visitors can upload to their conversation"
ON storage.objects FOR INSERT TO anon
WITH CHECK (
  bucket_id = 'chat-attachments'
  AND (storage.foldername(name))[1] IN (
    SELECT wcs.conversation_id::text
    FROM widget_chat_sessions wcs
    WHERE wcs.visitor_id = (
      current_setting('request.headers', true)::json->>'x-visitor-id'
    )
  )
);