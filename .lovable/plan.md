

## Fix: Internal Notes Displayed as Customer-Facing Messages in Chat

### Problem
Internal notes in the chat view look identical to regular agent messages (purple bubble). There's no visual distinction, making it appear the note was sent to the customer. **The note was NOT sent to the customer** — the backend correctly sets `is_internal: true` and skips email delivery. This is purely a display issue.

### Fix

**File: `src/components/conversations/ChatMessagesList.tsx`**

In the message rendering loop (around line 181-301), add internal note detection and styling:

1. **Detect internal notes**: Check `message.isInternalNote` (already available on `NormalizedMessage`)

2. **Render internal notes differently**:
   - Use a **yellow/amber background** instead of the purple agent bubble (matching the reply composer's note mode styling)
   - Add a **"Internal note" label** with a lock/sticky-note icon above the bubble
   - Keep right-aligned (agent side) but visually distinct

3. **Specific changes**:
   - Add `const isInternal = message.isInternalNote;` alongside the existing `isAgent`/`isSystem` checks
   - Change bubble classes: when `isInternal`, use `bg-yellow-50 text-foreground border border-yellow-200` instead of `bg-primary text-primary-foreground`
   - Add a small badge/label: `🔒 Internal note` above the bubble text
   - Hide the email delivery checkmarks for internal notes (they already have no `emailStatus`)

This aligns with the existing internal note styling used in the email/thread view (`MessageItem.tsx` line 89-93) and the composer's note mode yellow background.

