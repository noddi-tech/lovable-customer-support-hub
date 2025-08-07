-- Backfill received_at for existing conversations using the first customer message timestamp
UPDATE public.conversations 
SET received_at = (
  SELECT MIN(m.created_at)
  FROM public.messages m 
  WHERE m.conversation_id = conversations.id 
  AND m.sender_type = 'customer'
)
WHERE received_at IS NULL;