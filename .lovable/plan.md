
# Fix HTML Showing in Search Message Previews

## Problem

Message search results display raw HTML tags in the preview text (e.g., `<div dir="ltr">Hei, <div><br></div>...`). This is because the content from the search API contains HTML, and line 189 of `SearchCommandPalette.tsx` renders it directly with `.substring(0, 120)` -- no stripping.

## Fix

**File: `src/components/search/SearchCommandPalette.tsx`**

Import the existing `stripHtml` utility from `@/utils/stripHtml` and wrap `r.content` with it before truncating.

```tsx
// Line 1-2: Add import
import { stripHtml } from '@/utils/stripHtml';

// Line 189: Change from:
{r.content?.substring(0, 120)}

// To:
{stripHtml(r.content)?.substring(0, 120)}
```

This reuses the existing `stripHtml` function which already handles removing tags, decoding HTML entities, and collapsing whitespace.

## Files Changed

| File | Change |
|---|---|
| `src/components/search/SearchCommandPalette.tsx` | Import `stripHtml`, apply to message content preview |
