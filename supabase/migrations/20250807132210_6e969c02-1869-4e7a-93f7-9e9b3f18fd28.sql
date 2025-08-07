-- Final comprehensive backfill with working email date extraction
UPDATE public.conversations 
SET received_at = COALESCE(
  (SELECT public.extract_email_date(m.email_headers)
   FROM public.messages m 
   WHERE m.conversation_id = conversations.id 
   AND m.sender_type = 'customer'
   AND m.email_headers IS NOT NULL
   ORDER BY m.created_at ASC
   LIMIT 1),
  (SELECT MIN(m.created_at)
   FROM public.messages m 
   WHERE m.conversation_id = conversations.id 
   AND m.sender_type = 'customer'),
   conversations.created_at
);