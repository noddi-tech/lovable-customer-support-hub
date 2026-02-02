
# Fix: Remove Line Breaks from Slack Notification Previews

## Problem

Looking at your screenshot, the Slack notification shows only "Hei," as the preview, which is just the first line of a multi-line message. The rest of the message content after the line break is being cut off.

The issue is in the PostgreSQL `strip_html_tags` function. The current regex for normalizing line breaks uses incorrect escape syntax:

```sql
result := regexp_replace(result, E'[\\r\\n\\t]+', ' ', 'g');
```

In PostgreSQL escape string syntax (`E'...'`), `\\r` becomes a literal backslash followed by 'r', not a carriage return character. The correct syntax should use single backslashes.

## Solution

Fix the regex patterns in `strip_html_tags` to properly match and replace line break characters:

**Current (broken):**
```sql
result := regexp_replace(result, E'[\\r\\n\\t]+', ' ', 'g');
result := regexp_replace(result, '\\s+', ' ', 'g');
```

**Fixed:**
```sql
-- Replace newlines, carriage returns, and tabs with space
result := regexp_replace(result, E'[\r\n\t]+', ' ', 'g');
-- Then collapse multiple spaces
result := regexp_replace(result, ' +', ' ', 'g');
```

## Implementation

### Database Migration

**File: `supabase/migrations/[new]_fix_strip_html_linebreaks.sql`**

Update the `strip_html_tags` function with corrected regex patterns for line break handling.

```sql
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
  
  -- [existing HTML stripping logic - unchanged]
  
  -- FIX: Clean up excessive whitespace with correct escaping
  result := regexp_replace(result, E'[\r\n\t]+', ' ', 'g');  -- Single backslash in E'' string
  result := regexp_replace(result, ' +', ' ', 'g');          -- Collapse multiple spaces
  result := trim(result);
  
  RETURN result;
END;
$$;
```

## Files to Modify

| File | Changes |
|------|---------|
| `supabase/migrations/[new]_fix_strip_html_linebreaks.sql` | Fix regex escaping for line break normalization |

## Expected Result

**Before (broken):**
```
> Hei,
```

**After (fixed):**
```
> Hei, Takk for rask respons! Jeg lurer på om dere har mulighet til å...
```

The preview will now show the full message content (up to 180 characters) as a single line, regardless of how many line breaks were in the original email.

## Technical Note

The edge function's `cleanPreviewText` (line 127-128) already correctly handles line breaks. The fix only needs to be applied to the PostgreSQL function since it runs first and the preview_text is already broken by the time it reaches the edge function.
