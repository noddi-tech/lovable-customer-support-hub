

## Plan: Fix team-member mention click being swallowed by outside-click handler

### Root cause

`MentionTextarea` registers a global `mousedown` listener that closes the popover whenever the click target is outside the `<textarea>` element. The Radix Popover content is portaled to `document.body`, so clicking on "Tom Arne Danielsen" in the dropdown counts as "outside" → the popover closes on `mousedown` → the `CommandItem.onSelect` (which fires on `mouseup/click`) never runs. Keyboard `Enter` works (no mousedown), which is why the original `@tom` insert in the composer worked once it was selected — but mouse clicks on suggestions silently do nothing.

This bug exists everywhere `MentionTextarea` is used: the new `InlineNoteEditor` (chat + email + mobile), the `CustomerNotes` add/edit, and the live-chat reply composer.

### Fix (single file: `src/components/ui/mention-textarea.tsx`)

1. **Remove the buggy outside-click handler.** Radix `Popover` already closes on outside clicks via `onInteractOutside`, and we only want to keep it open while interacting with the textarea or the popover content.
2. **Let Radix handle it.** Replace the `useEffect` mousedown listener with the controlled-popover pattern:
   - Keep `open={mentionState.isOpen}`.
   - Use `onOpenChange` to close (already wired).
   - Add `onInteractOutside` on `PopoverContent` that ignores clicks targeting the textarea (so typing/clicking in the textarea doesn't close it), and otherwise allows the default close.
3. **Prevent focus stealing on item click.** Add `onMouseDown={(e) => e.preventDefault()}` to each `CommandItem` so the textarea keeps focus through the click and the cursor-position logic in `handleSelectMember` (which reads `textarea.selectionStart`) still works.
4. **Sanity: ensure `handleSelectMember` runs even if the textarea lost focus.** Fall back to `mentionState.triggerIndex + searchQuery.length + 1` when `selectionStart` is stale, so insertion still produces the correct `@[Full Name] ` text.

No DB changes, no other components touched. Behavior unchanged for keyboard users; mouse clicks now insert the mention as expected.

### Verification

1. Open the conversation in the screenshot, click **Edit note** on the yellow bubble.
2. Type `@to` → "Tom Arne Danielsen" appears in the popover.
3. **Click his name with the mouse** → bubble text becomes `@[Tom Arne Danielsen] ` and popover closes.
4. Press **⌘/Ctrl + Enter** (or click Save) → toast "Note updated", `(edited)` marker appears, mention chip renders, Tom gets a notification.
5. Repeat with keyboard only (`@to` → `Enter`) — still works.
6. Spot-check `CustomerNotes` add/edit and the live-chat internal-note composer — clicking a suggested name now inserts it there too.

