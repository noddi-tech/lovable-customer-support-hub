

# Fix: Slack Notifications Missing Preview Text

## Problem Identified

The database triggers are calling `strip_html_tags(LEFT(content, 200))` which truncates the HTML **before** stripping tags. For emails with complex HTML (Microsoft Outlook, Gmail), the first 200 characters are often pure HTML markup with no actual text content.

**Example of truncated input:**
```html
<html xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word" xmlns:m="http://schemas.microsoft.com/office/2004/12/omm
```

After attempting to strip HTML, the result is still HTML fragments because the actual message body was truncated away.

## Solution

### 1. Fix the Order of Operations in Database Triggers

Change from:
```sql
strip_html_tags(LEFT(content, 200))  -- WRONG: truncates before stripping
```

To:
```sql
LEFT(strip_html_tags(content), 200)  -- CORRECT: strips first, then truncates
```

### 2. Improve the strip_html_tags() Function

The current function is too simple. It needs to:
- Remove `<head>` section entirely (contains CSS, no text)
- Handle namespaced tags like `<o:p>`, `<v:shape>`
- Use multi-line regex mode for style/script removal
- Decode more HTML entities

## Implementation

### Migration: Update Triggers and strip_html_tags Function

**File: `supabase/migrations/[new]_fix_slack_preview_text.sql`**

```sql
-- Improve strip_html_tags to handle complex HTML
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
  
  -- Remove style, script, title sections
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
  
  -- Clean up excessive whitespace
  result := regexp_replace(result, E'[\\r\\n\\t]+', ' ', 'g');
  result := regexp_replace(result, '\\s+', ' ', 'g');
  result := trim(result);
  
  RETURN result;
END;
$$;
```

### Update Triggers: Fix Order of Operations

```sql
-- Update notify_slack_on_new_message trigger
CREATE OR REPLACE FUNCTION public.notify_slack_on_new_message()
-- ... (existing declaration section) ...
  body := jsonb_build_object(
    -- ... other fields ...
    'preview_text', LEFT(strip_html_tags(NEW.content), 200),  -- FIXED: strip first, then truncate
    -- ... other fields ...
  )
-- ... rest of function ...

-- Update notify_slack_on_conversation_update trigger  
CREATE OR REPLACE FUNCTION public.notify_slack_on_conversation_update()
-- ... (existing declaration section) ...
  body := jsonb_build_object(
    -- ... other fields ...
    'preview_text', COALESCE(LEFT(strip_html_tags(v_latest_message.content), 200), ''),  -- FIXED
    -- ... other fields ...
  )
-- ... rest of function ...
```

## Files to Modify

| File | Changes |
|------|---------|
| `supabase/migrations/[new]_fix_slack_preview_text.sql` | Improved strip_html_tags + fixed trigger order |

## Testing

After migration:
1. Send a test email with complex HTML (Outlook/Gmail) → Should show preview text
2. Send a simple text email → Should continue to work
3. Verify existing Slack integration settings still work

## Expected Result

Before (broken):
```text
📧 New Email Conversation in Noddi
From: tomas@balproma.com
Subject: Professional Tire Packaging...
[View Conversation]
```

After (fixed):
```text
📧 New Email Conversation in Noddi
From: tomas@balproma.com
Subject: Professional Tire Packaging...
> Hei, vi er en leverandør av profesjonelle dekkemballasjeløsninger...
[View Conversation]
```

