
# Fix Cancel Booking Flow: Three Root Causes

## Problems Identified

**Problem 1: Booking info card + action menu shown after successful cancellation**
After `cancel_booking` succeeds, `patchBookingInfo` still finds booking data from the earlier `lookup_customer` tool call and injects a `[BOOKING_INFO]` card. Then `patchActionMenu` sees `[BOOKING_INFO]` and auto-appends the edit action menu. Result: the user sees a "cancelled" message alongside a booking card with "Endre tidspunkt", "Avbestille bestilling" etc.

**Problem 2: Raw `[YES_NO]...[/YES_NO]` markers showing as text inside `[CONFIRM]` block**
The AI nests `[YES_NO]` markers inside `[CONFIRM]` content: `[CONFIRM]Du har valgt a kansellere...[YES_NO]Er du sikker?[/YES_NO][/CONFIRM]`. The parser treats the outer `[CONFIRM]` as the block, so the inner `[YES_NO]...[/YES_NO]` becomes raw text displayed in the summary paragraph.

**Problem 3: `patchYesNo` doesn't skip when `[CONFIRM]` is already present**
The `otherMarkers` exclusion list doesn't include `[CONFIRM]`, so the post-processor may additionally wrap questions in `[YES_NO]` even when a confirm card is already present.

## Changes

### 1. `supabase/functions/widget-ai-chat/index.ts` -- patchBookingInfo

Add a guard at the top: scan tool results for a successful `cancel_booking` call. If found, skip injection entirely.

```typescript
// Skip if cancel_booking was called successfully — booking is gone
for (let i = messages.length - 1; i >= 0; i--) {
  if (messages[i].role === 'tool') {
    try {
      const r = JSON.parse(messages[i].content);
      if (r.success && r.message?.toLowerCase().includes('cancelled')) return reply;
    } catch {}
  }
}
```

### 2. `supabase/functions/widget-ai-chat/index.ts` -- patchActionMenu

Same guard: skip if `cancel_booking` succeeded.

```typescript
// Skip if cancel_booking was called successfully
for (let i = messages.length - 1; i >= 0; i--) {
  if (messages[i].role === 'tool') {
    try {
      const r = JSON.parse(messages[i].content);
      if (r.success && r.message?.toLowerCase().includes('cancelled')) return reply;
    } catch {}
  }
}
```

### 3. `supabase/functions/widget-ai-chat/index.ts` -- patchYesNo

Add `[CONFIRM]` to the `otherMarkers` exclusion list so YES_NO wrapping is skipped when a confirm card is already present.

### 4. `src/widget/components/blocks/ConfirmBlock.tsx` -- Strip nested markers from summary

In `parseContent`, strip any `[TAG]...[/TAG]` patterns from the inner text so nested markers never render as raw text:

```typescript
parseContent: (inner) => {
  // Strip any nested marker tags (e.g. [YES_NO]...[/YES_NO])
  const cleaned = inner.replace(/\[[A-Z_]+\]([\s\S]*?)\[\/[A-Z_]+\]/g, '$1').trim();
  return { summary: cleaned };
},
```

### 5. `src/widget/utils/parseMessageBlocks.ts` -- More aggressive marker stripping

Enhance the post-filter to strip text blocks that *contain* marker tags (not just exact matches), catching cases where markers appear inline with short surrounding text:

```typescript
return blocks.filter(b => {
  if (b.type !== 'text') return true;
  const trimmed = (b as any).content?.trim();
  if (!trimmed) return false;
  // Exact match: text is just a marker tag
  if (markerTags.has(trimmed)) return false;
  // Contains marker tags with minimal surrounding text
  let stripped = trimmed;
  for (const tag of markerTags) {
    stripped = stripped.replaceAll(tag, '');
  }
  if (stripped.trim().length === 0) return false;
  return true;
});
```

### 6. Deploy edge function

Redeploy `widget-ai-chat` after changes.

## Summary

| File | Change |
|------|--------|
| `widget-ai-chat/index.ts` (patchBookingInfo) | Skip when cancel_booking succeeded |
| `widget-ai-chat/index.ts` (patchActionMenu) | Skip when cancel_booking succeeded |
| `widget-ai-chat/index.ts` (patchYesNo) | Add `[CONFIRM]` to exclusion list |
| `ConfirmBlock.tsx` (parseContent) | Strip nested marker tags from summary text |
| `parseMessageBlocks.ts` (post-filter) | Strip text blocks that are only marker tags |
