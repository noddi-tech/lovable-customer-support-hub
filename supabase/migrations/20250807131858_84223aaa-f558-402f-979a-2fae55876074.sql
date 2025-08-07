-- Final fix for email date extraction with correct value access
CREATE OR REPLACE FUNCTION public.extract_email_date(email_headers jsonb)
RETURNS TIMESTAMP WITH TIME ZONE
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
DECLARE
  date_header TEXT;
  parsed_date TIMESTAMP WITH TIME ZONE;
BEGIN
  -- Find the Date header value from email headers array
  SELECT header->>'value' INTO date_header
  FROM jsonb_array_elements(email_headers) AS header
  WHERE header->>'name' = 'Date'
  LIMIT 1;
  
  IF date_header IS NULL THEN
    RETURN NULL;
  END IF;
  
  -- Parse the RFC 2822 date format
  BEGIN
    parsed_date := date_header::timestamptz;
    RETURN parsed_date;
  EXCEPTION WHEN OTHERS THEN
    RETURN NULL;
  END;
END;
$function$;

-- Final backfill with actual email dates
UPDATE public.conversations 
SET received_at = COALESCE(
  (SELECT public.extract_email_date(m.email_headers)
   FROM public.messages m 
   WHERE m.conversation_id = conversations.id 
   AND m.sender_type = 'customer'
   AND m.email_headers IS NOT NULL
   ORDER BY m.created_at ASC
   LIMIT 1),
  received_at
);

-- Also update the Gmail sync function to use this extraction method for new emails
-- This ensures future emails get the correct received_at timestamp