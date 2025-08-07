-- Improved email date extraction function with better RFC2822 parsing
CREATE OR REPLACE FUNCTION public.extract_email_date(email_headers jsonb)
RETURNS timestamp with time zone
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
DECLARE
  date_header TEXT;
  parsed_date TIMESTAMP WITH TIME ZONE;
  cleaned_date TEXT;
BEGIN
  -- Find the Date header value from email headers array
  SELECT header->>'value' INTO date_header
  FROM jsonb_array_elements(email_headers) AS header
  WHERE header->>'name' = 'Date'
  LIMIT 1;
  
  IF date_header IS NULL THEN
    RETURN NULL;
  END IF;
  
  -- Clean the date string - remove extra whitespace and handle various formats
  cleaned_date := trim(regexp_replace(date_header, '\s+', ' ', 'g'));
  
  -- Try various parsing strategies
  BEGIN
    -- Try direct parsing first
    parsed_date := cleaned_date::timestamptz;
    RETURN parsed_date;
  EXCEPTION WHEN OTHERS THEN
    BEGIN
      -- Try removing day name if present (e.g., "Thu, 7 Aug 2025..." -> "7 Aug 2025...")
      cleaned_date := regexp_replace(cleaned_date, '^[A-Za-z]{3},?\s*', '');
      parsed_date := cleaned_date::timestamptz;
      RETURN parsed_date;
    EXCEPTION WHEN OTHERS THEN
      BEGIN
        -- Try removing timezone abbreviation in parentheses (e.g., "(CDT)", "(UTC)")
        cleaned_date := regexp_replace(cleaned_date, '\s*\([A-Z]{2,4}\)\s*$', '');
        parsed_date := cleaned_date::timestamptz;
        RETURN parsed_date;
      EXCEPTION WHEN OTHERS THEN
        BEGIN
          -- Try both - remove day name AND timezone abbreviation
          cleaned_date := trim(regexp_replace(date_header, '\s+', ' ', 'g'));
          cleaned_date := regexp_replace(cleaned_date, '^[A-Za-z]{3},?\s*', '');
          cleaned_date := regexp_replace(cleaned_date, '\s*\([A-Z]{2,4}\)\s*$', '');
          parsed_date := cleaned_date::timestamptz;
          RETURN parsed_date;
        EXCEPTION WHEN OTHERS THEN
          -- Log the problematic date for debugging
          RAISE WARNING 'Failed to parse date header: %', date_header;
          RETURN NULL;
        END;
      END;
    END;
  END;
END;
$$;