-- Backfill actual email dates from headers for all existing conversations
UPDATE public.conversations 
SET received_at = COALESCE(
  -- Try to extract actual email date from headers
  (SELECT public.extract_email_date(m.email_headers)
   FROM public.messages m 
   WHERE m.conversation_id = conversations.id 
   AND m.sender_type = 'customer'
   AND m.email_headers IS NOT NULL
   ORDER BY m.created_at ASC
   LIMIT 1),
  -- Fallback to first customer message timestamp
  (SELECT MIN(m.created_at)
   FROM public.messages m 
   WHERE m.conversation_id = conversations.id 
   AND m.sender_type = 'customer'),
   -- Final fallback to conversation created_at
   conversations.created_at
)
WHERE received_at IS NULL OR received_at = created_at;