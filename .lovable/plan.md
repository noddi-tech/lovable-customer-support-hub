

## Fix: Raw HTML Tags Showing as Visible Text + Style Sanitizer Conflicts

### Problem

The screenshot shows `<div dir="auto"></div><br>` and `<p></p>` rendered as literal text. The email body is unreadable.

### Root Cause Analysis

**Bug 1: Empty-content fallback dumps raw HTML as plain text (critical)**

In `src/components/ui/email-render.tsx` lines 413-431, when DOMPurify sanitization produces content with very little visible text (< 10 chars), the component falls back to rendering the **raw unsanitized `content`** inside a `<pre>` tag:

```tsx
if (!sanitizedContent || visibleText.trim().length < 10) {
  return (
    <div className="email-render__plain-content">
      <pre>{content}</pre>  // RAW HTML shown as literal text!
    </div>
  );
}
```

This email is a forwarded thread (`Fwd: Re: Fwd:`) where the "new" visible content is nearly empty — just empty `<div>` and `<p>` tags. The quote parser strips the forwarded body. The visible text check finds < 10 chars, triggers the fallback, and the raw HTML source (with all its tags) is rendered as plain text.

**Bug 2: Style sanitizer strips `height` and `display` from images**

The DOMPurify hook sets `style="max-width: 100%; height: auto; display: block;"` on images (line 223), but the style sanitizer (line 250-288) only allows `height` and `display` for table elements. For `<IMG>` elements, `height: auto` and `display: block` are stripped, leaving only `max-width: 100%`.

### Fix

**File: `src/components/ui/email-render.tsx`**

1. Change the empty-content fallback to render the sanitized HTML instead of raw content. If sanitized content exists but has short visible text, still render it as HTML — the email may legitimately be very short. Only fall back to plain text if `sanitizedContent` is truly empty string.

```tsx
// Before (broken):
if (!sanitizedContent || visibleText.trim().length < 10) {
  return <pre>{content}</pre>;
}

// After (fixed):
if (!sanitizedContent) {
  // Truly empty after sanitization — show original as plain text
  return <div className="email-render__plain-content">
    <pre>{stripHtmlTags(content)}</pre>
  </div>;
}
// Otherwise render the sanitized HTML normally, even if short
```

**File: `src/utils/emailFormatting.ts`**

2. Add `height`, `display`, `max-height` to `baseProperties` in the style sanitizer so they aren't stripped from images:

```ts
const baseProperties = [
  'color', 'background-color', 'background', 'font-family', 'font-size', 'font-weight',
  'text-decoration', 'text-align', 'margin', 'padding', 'border',
  // ... existing ...
  'max-width', 'height', 'max-height', 'display'  // Added
];
```

### Summary

| # | File | Change |
|---|------|--------|
| 1 | `src/components/ui/email-render.tsx` | Fix empty-content fallback to not dump raw HTML as text |
| 2 | `src/utils/emailFormatting.ts` | Add `height`, `display`, `max-height` to allowed base style properties |

