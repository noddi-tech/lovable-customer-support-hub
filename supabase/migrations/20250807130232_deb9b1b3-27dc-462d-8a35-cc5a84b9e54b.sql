-- Create a function to extract email date from headers
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
  -- Find the Date header from email headers
  SELECT value INTO date_header
  FROM jsonb_array_elements(email_headers) AS header
  WHERE header->>'name' = 'Date'
  LIMIT 1;
  
  IF date_header IS NULL THEN
    RETURN NULL;
  END IF;
  
  -- Try multiple date formats
  BEGIN
    -- Format: "1 Aug 2025 09:37:47 +0200"
    parsed_date := TO_TIMESTAMP(date_header, 'DD Mon YYYY HH24:MI:SS +HHMM');
    RETURN parsed_date;
  EXCEPTION WHEN OTHERS THEN
    BEGIN
      -- Format: "Fri, 1 Aug 2025 09:37:47 +0200"
      parsed_date := TO_TIMESTAMP(date_header, 'Dy, DD Mon YYYY HH24:MI:SS +HHMM');
      RETURN parsed_date;
    EXCEPTION WHEN OTHERS THEN
      BEGIN
        -- Format: "Fri, 01 Aug 2025 09:37:47 +0200" 
        parsed_date := TO_TIMESTAMP(date_header, 'Dy, DD Mon YYYY HH24:MI:SS +HHMM');
        RETURN parsed_date;
      EXCEPTION WHEN OTHERS THEN
        RETURN NULL;
      END;
    END;
  END;
END;
$function$;

-- Update existing conversations with extracted email dates
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