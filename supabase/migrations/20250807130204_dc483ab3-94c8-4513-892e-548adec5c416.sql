-- Create a better backfill using actual email Date headers
UPDATE public.conversations 
SET received_at = (
  SELECT 
    CASE 
      WHEN headers.value IS NOT NULL THEN 
        COALESCE(
          TO_TIMESTAMP(headers.value, 'DD Mon YYYY HH24:MI:SS +0000'),
          TO_TIMESTAMP(headers.value, 'Mon, DD Mon YYYY HH24:MI:SS +0000'),
          MIN(m.created_at)
        )
      ELSE MIN(m.created_at)
    END
  FROM public.messages m 
  LEFT JOIN jsonb_array_elements(m.email_headers) header ON true
  LEFT JOIN jsonb_each_text(header) headers ON headers.key = 'name' AND headers.value = 'Date'
  LEFT JOIN jsonb_each_text(header) header_values ON header_values.key = 'value'
  WHERE m.conversation_id = conversations.id 
  AND m.sender_type = 'customer'
  GROUP BY headers.value, header_values.value
)
WHERE received_at IS NOT NULL;