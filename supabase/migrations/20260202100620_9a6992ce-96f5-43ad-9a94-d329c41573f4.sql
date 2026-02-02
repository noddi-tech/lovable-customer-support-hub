-- Fix line break handling in strip_html_tags function
-- The previous regex E'[\\r\\n\\t]+' was broken because \\ becomes a literal backslash
-- Use single backslash in E'' string: E'[\r\n\t]+' correctly matches actual control characters

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
  
  result := input_text;
  
  -- Remove DOCTYPE, XML declarations
  result := regexp_replace(result, '<!DOCTYPE[^>]*>', '', 'gi');
  result := regexp_replace(result, '<\?xml[^>]*\?>', '', 'gi');
  
  -- Remove entire HEAD section (contains CSS/fonts, no readable text)
  result := regexp_replace(result, '<head[^>]*>.*?</head>', '', 'gis');
  
  -- Remove style, script, title sections (multi-line mode)
  result := regexp_replace(result, '<style[^>]*>.*?</style>', '', 'gis');
  result := regexp_replace(result, '<script[^>]*>.*?</script>', '', 'gis');
  result := regexp_replace(result, '<title[^>]*>.*?</title>', '', 'gis');
  
  -- Remove HTML comments and conditional comments
  result := regexp_replace(result, '<!--.*?-->', '', 'gs');
  result := regexp_replace(result, '<!\[if[^>]*\]>.*?<!\[endif\]>', '', 'gis');
  
  -- Remove namespaced tags (o:p, v:shape, w:*, m:*)
  result := regexp_replace(result, '<[a-z]+:[^>]*>.*?</[a-z]+:[^>]*>', '', 'gis');
  result := regexp_replace(result, '<[a-z]+:[^>]*/>', '', 'gi');
  result := regexp_replace(result, '</?[a-z]+:[^>]*>', '', 'gi');
  
  -- Strip all remaining HTML tags
  result := regexp_replace(result, '<[^>]*>', '', 'g');
  
  -- Remove leftover angle brackets
  result := regexp_replace(result, '[<>]', ' ', 'g');
  
  -- Decode common HTML entities
  result := replace(result, '&nbsp;', ' ');
  result := replace(result, '&amp;', '&');
  result := replace(result, '&lt;', '<');
  result := replace(result, '&gt;', '>');
  result := replace(result, '&quot;', '"');
  result := replace(result, '&#39;', '''');
  result := replace(result, '&apos;', '''');
  
  -- FIX: Replace newlines, carriage returns, and tabs with space
  -- Use single backslash in E'' string to match actual control characters
  result := regexp_replace(result, E'[\r\n\t]+', ' ', 'g');
  
  -- Collapse multiple spaces into one
  result := regexp_replace(result, ' +', ' ', 'g');
  
  result := trim(result);
  
  RETURN result;
END;
$$;