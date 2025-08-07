-- Update conversations with corrected received_at dates using improved function
UPDATE conversations 
SET received_at = extract_email_date(m.email_headers),
    updated_at = now()
FROM messages m 
WHERE m.conversation_id = conversations.id 
AND m.email_headers IS NOT NULL 
AND extract_email_date(m.email_headers) IS NOT NULL
AND extract_email_date(m.email_headers) != conversations.received_at;