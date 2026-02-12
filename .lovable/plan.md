

# Fix: Time Slot API Errors and Duplicate Customer Messages

## Issue 1: Time Slot 502 Errors (Root Cause)

The Noddi API returns `Address with pk=48291 not found` because:

1. The AI sometimes emits JSON inside the marker (`[TIME_SLOT]{"address_id":12345,...}[/TIME_SLOT]`) instead of the expected `2860::dekkskift` format
2. The `parseContent` function only splits on `::`, so JSON content breaks parsing completely
3. Even with the prompt fix, the AI occasionally ignores the format instruction

**Fix:** Make `parseContent` in `TimeSlotBlock.tsx` handle both formats -- try JSON parsing first as fallback, then fall back to `::` splitting. This makes the component resilient regardless of what format the AI uses.

```
parseContent: (inner) => {
  // Try JSON first (AI sometimes emits JSON)
  try {
    const parsed = JSON.parse(inner.trim());
    return {
      address_id: parsed.address_id || '',
      proposal_slug: parsed.service_slug || parsed.proposal_slug || '',
    };
  } catch {}
  // Fallback: split on ::
  const parts = inner.trim().split('::');
  return {
    address_id: parts[0] || '',
    proposal_slug: parts[1] || '',
  };
}
```

## Issue 2: Block Selections Showing as Customer Messages

In `AiChat.tsx` `handleActionSelect` (line 228-274), every block action creates a visible customer message bubble with the display label. The address shows as "Slemdalsvingen 65, Oslo", the reg number as "ec94156", and the service as "Dekkskift" -- all as purple customer bubbles.

This is redundant because each interactive component already displays a green checkmark badge inline showing what was selected.

**Fix:** Change `handleActionSelect` to always send the payload as a hidden message, never creating a visible customer bubble. The inline confirmation badges in each block component are sufficient visual feedback.

```
// In handleActionSelect, always send hidden:
sendMessage(option, undefined, { hidden: true });
```

No visible user message is created -- the block's own badge (green checkmark with selection text) provides the feedback.

## Files to Change

1. **`src/widget/components/blocks/TimeSlotBlock.tsx`** -- Update `parseContent` to handle both JSON and `::` formats
2. **`src/widget/components/AiChat.tsx`** -- Update `handleActionSelect` to send all block actions as hidden messages (no visible customer bubble)

## Deployment

No edge function changes needed -- both fixes are frontend-only.
