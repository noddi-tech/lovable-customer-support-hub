-- Fix the email date extraction function to handle the correct header structure
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
  -- Find the Date header from email headers array
  SELECT value INTO date_header
  FROM jsonb_array_elements(email_headers) AS header
  WHERE header->>'name' = 'Date'
  LIMIT 1;
  
  IF date_header IS NULL THEN
    RETURN NULL;
  END IF;
  
  -- Clean and try to parse the date
  BEGIN
    -- Use PostgreSQL's built-in date parsing which handles most RFC 2822 formats
    parsed_date := date_header::timestamptz;
    RETURN parsed_date;
  EXCEPTION WHEN OTHERS THEN
    -- If parsing fails, return null (will fallback to message created_at)
    RETURN NULL;
  END;
END;
$function$;

-- Re-run the backfill with corrected extraction
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