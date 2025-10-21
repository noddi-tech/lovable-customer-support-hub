-- Fix search_path security issue in strip_html_tags function
CREATE OR REPLACE FUNCTION public.strip_html_tags(input_text text)
RETURNS text
LANGUAGE plpgsql
IMMUTABLE
SET search_path = public
AS $$
DECLARE
  result text;
BEGIN
  IF input_text IS NULL THEN
    RETURN NULL;
  END IF;
  
  -- First, remove style and script tag contents
  result := regexp_replace(input_text, '<style[^>]*>.*?</style>', '', 'gi');
  result := regexp_replace(result, '<script[^>]*>.*?</script>', '', 'gi');
  
  -- Then strip all remaining HTML tags
  result := regexp_replace(result, '<[^>]*>', '', 'g');
  
  -- Decode common HTML entities
  result := replace(result, '&nbsp;', ' ');
  result := replace(result, '&amp;', '&');
  result := replace(result, '&lt;', '<');
  result := replace(result, '&gt;', '>');
  result := replace(result, '&quot;', '"');
  result := replace(result, '&#39;', '''');
  
  -- Clean up excessive whitespace
  result := regexp_replace(result, '\s+', ' ', 'g');
  result := trim(result);
  
  RETURN result;
END;
$$;