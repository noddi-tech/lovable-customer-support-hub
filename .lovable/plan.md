

## Fix: Empty Email Body When All Content Is Quoted/Forwarded

### Problem

The first message in the thread (a `Fwd: Re: Fwd:` email) renders with a completely empty body. Only "Show quoted text" appears. The user correctly asks: "How can we have answered an empty email?"

### Root Cause

This is caused by our quote-stripping logic, NOT by the recent CSS changes.

**Flow:**
1. `normalizeMessage()` calls `parseQuotedEmail()` which runs `extractFromHtml()`
2. `extractFromHtml()` detects Gmail/Outlook quoted containers and `blockquote` elements, stripping them all
3. For forwarded emails (`Fwd:`), the **entire body IS the forwarded content** — there's no "new" text above it
4. After stripping, `visibleContent` is empty
5. `normalizeMessage` sets `visibleBody = parsedContent.visibleContent` (empty string)
6. `MessageItem` renders `message.visibleBody` → nothing visible

**Then in `email-render.tsx`:**
- Line 392: `processedContent.trim().length > 10` is false (empty), so it falls back to raw `content`
- But `sanitizeEmailHTML` also calls `parseQuotedEmail` again, which strips everything again
- Result: empty content rendered

### Fix

**File: `src/lib/parseQuotedEmail.ts`** — Add a safety check at the end of `extractFromHtml()`: if the visible content after stripping is empty or trivially short (< 20 chars of text), restore the original content and clear the quoted blocks. The email should show the full content rather than nothing.

```ts
// After STEP 5, before return:
const textOnly = (body.textContent || body.innerText || '').trim();
if (textOnly.length < 20 && quoted.length > 0) {
  // All content was classified as quoted — restore it as visible
  // This happens with forwarded emails where the entire body is the forward
  return {
    visibleHTML: html, // Return original HTML
    quoted: [],        // Don't strip anything
    quotedMessages: []
  };
}
```

**File: `src/components/ui/email-render.tsx`** — Remove the line 392-394 fallback that substitutes raw unsanitized `content` when `processedContent` is short. This is dangerous (renders unsanitized HTML) and now unnecessary since `parseQuotedEmail` will no longer produce empty output.

```tsx
// Before (line 392-394):
const contentToRender = processedContent.trim().length > 10 
  ? processedContent 
  : content;

// After:
const contentToRender = processedContent;
```

### Summary

| # | File | Change |
|---|------|--------|
| 1 | `src/lib/parseQuotedEmail.ts` | If visible content is empty after quote stripping, restore original |
| 2 | `src/components/ui/email-render.tsx` | Remove unsafe raw-content fallback |

This ensures forwarded emails always show their content. The "Show quoted text" feature still works for emails that have genuine new content above the quoted section. No CSS or formatting changes needed.

