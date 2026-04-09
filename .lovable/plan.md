

# Fix: Show Unreferenced "Inline" Attachments

## Problem

Gmail marks image attachments with `isInline: true` even when they're regular photo attachments (not embedded in the email body). The current code:
- Hides them from the "Attachments" section (which only shows `!isInline`)
- Tries to render them inline via CID replacement in the HTML — but since the HTML doesn't contain any `cid:` references to these images, they never appear

Result: the badge says "4 attachments" but nothing is visible or downloadable.

## Fix

### `src/components/ui/email-render.tsx`

Add a check: after the HTML content is processed, identify attachments that are marked `isInline` but whose `contentId` is NOT actually referenced in the email HTML body. Treat those as regular downloadable attachments.

Change the attachment filtering logic (~line 603) from:

```typescript
attachments.filter(a => !a.isInline)
```

To a computed list that includes:
1. Attachments explicitly marked as not inline (`!a.isInline`)
2. Attachments marked as inline but whose `contentId` is NOT found as `cid:` in the HTML content

Add a `useMemo` that computes "downloadable attachments":

```typescript
const downloadableAttachments = useMemo(() => {
  return attachments.filter(a => {
    // Explicitly non-inline → always show
    if (!a.isInline) return true;
    // Inline but no contentId → show as downloadable
    if (!a.contentId) return true;
    // Inline with contentId → only show if NOT referenced in HTML body
    if (isHTML) {
      const cidNormalized = a.contentId.replace(/[<>]/g, '');
      return !content.includes(`cid:${cidNormalized}`);
    }
    // Plain text can't have inline images
    return true;
  });
}, [attachments, content, isHTML]);
```

Then use `downloadableAttachments` in the three places where `attachments.filter(a => !a.isInline)` currently appears (lines 603, 606, 613).

### Single file change

- `src/components/ui/email-render.tsx` — add `downloadableAttachments` memo, use it in attachment section rendering

