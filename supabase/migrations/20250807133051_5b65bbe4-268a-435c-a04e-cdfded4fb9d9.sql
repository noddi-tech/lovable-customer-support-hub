-- Update extract_email_date function to properly handle RFC2822 date formats
CREATE OR REPLACE FUNCTION public.extract_email_date(email_headers jsonb)
RETURNS timestamp with time zone
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
  -- Handle various formats including "Thu, 07 Aug 2025 04:18:12 -0700"
  BEGIN
    -- First try direct parsing
    parsed_date := date_header::timestamptz;
    RETURN parsed_date;
  EXCEPTION WHEN OTHERS THEN
    -- If that fails, try removing extra whitespace and parsing again
    BEGIN
      parsed_date := trim(date_header)::timestamptz;
      RETURN parsed_date;
    EXCEPTION WHEN OTHERS THEN
      -- Log the problematic date for debugging
      RAISE WARNING 'Failed to parse date header: %', date_header;
      RETURN NULL;
    END;
  END;
END;
$function$;