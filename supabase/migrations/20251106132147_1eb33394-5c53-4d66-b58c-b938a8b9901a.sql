-- Phase 1: Delete the conversation with 16,999 messages causing 500 errors
-- This will cascade delete all messages due to foreign key constraints

DELETE FROM conversations 
WHERE id = '9ecfb57b-80c8-40a9-82a0-0c66fc4bd3c1';

-- Log the deletion
INSERT INTO debug_logs (event, data)
VALUES ('massive_conversation_cleanup', jsonb_build_object(
  'conversation_id', '9ecfb57b-80c8-40a9-82a0-0c66fc4bd3c1',
  'reason', 'Conversation had 16,999 messages causing 500 errors',
  'deleted_at', now()
));

-- Phase 4: Create function to find large conversations
CREATE OR REPLACE FUNCTION find_large_conversations(message_threshold integer DEFAULT 1000)
RETURNS TABLE(
  conversation_id uuid,
  subject text,
  message_count bigint,
  inbox_name text,
  created_at timestamp with time zone
)
LANGUAGE sql
SECURITY DEFINER
SET search_path TO ''
AS $$
  SELECT 
    c.id as conversation_id,
    c.subject,
    COUNT(m.id) as message_count,
    i.name as inbox_name,
    c.created_at
  FROM public.conversations c
  LEFT JOIN public.messages m ON m.conversation_id = c.id
  LEFT JOIN public.inboxes i ON i.id = c.inbox_id
  WHERE c.organization_id = public.get_user_organization_id()
  GROUP BY c.id, c.subject, i.name, c.created_at
  HAVING COUNT(m.id) > message_threshold
  ORDER BY message_count DESC;
$$;