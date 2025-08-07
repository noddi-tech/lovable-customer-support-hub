-- Update conversations with correct received_at dates from email headers
UPDATE conversations 
SET received_at = extract_email_date(m.email_headers),
    updated_at = now()
FROM messages m 
WHERE m.conversation_id = conversations.id 
AND m.email_headers IS NOT NULL 
AND extract_email_date(m.email_headers) IS NOT NULL
AND extract_email_date(m.email_headers) != conversations.received_at;

-- Log the update
INSERT INTO debug_logs (event, data) 
SELECT 'conversation_date_correction', 
       jsonb_build_object(
         'updated_count', count(*),
         'timestamp', now()
       )
FROM conversations c
JOIN messages m ON m.conversation_id = c.id
WHERE m.email_headers IS NOT NULL 
AND extract_email_date(m.email_headers) IS NOT NULL;