-- Create function to strip HTML tags and decode HTML entities
CREATE OR REPLACE FUNCTION strip_html_tags(input_text text)
RETURNS text
LANGUAGE plpgsql
IMMUTABLE
AS $$
BEGIN
  IF input_text IS NULL THEN
    RETURN NULL;
  END IF;
  
  -- Remove all HTML tags
  input_text := regexp_replace(input_text, '<[^>]*>', '', 'g');
  
  -- Decode common HTML entities
  input_text := replace(input_text, '&nbsp;', ' ');
  input_text := replace(input_text, '&lt;', '<');
  input_text := replace(input_text, '&gt;', '>');
  input_text := replace(input_text, '&amp;', '&');
  input_text := replace(input_text, '&quot;', '"');
  input_text := replace(input_text, '&#39;', '''');
  input_text := replace(input_text, '&apos;', '''');
  
  -- Remove extra whitespace
  input_text := regexp_replace(input_text, '\s+', ' ', 'g');
  input_text := trim(input_text);
  
  RETURN input_text;
END;
$$;