

## Plan: Final fix for both note bugs — eliminate the actual remaining root causes

### Reality check first

The user-supplied diagnosis is partially stale (earlier rounds already removed several anti-patterns). After re-reading the current files, the real remaining causes are different from what was described, but they ARE both real. Here is what is actually happening today.

### Bug 2 — Screen freeze after deleting a note (real cause)

The freeze happens when deleting an **internal note in the conversation view**, not in `CustomerNotes`.

What the session replay shows after confirming a delete:
- `<body data-scroll-locked="2">` stays applied
- Multiple `data-aria-hidden="true"` siblings stay applied
- A `data-radix-focus-guard` span stays in the DOM

That is Radix's `AlertDialog` body-lock that never got cleaned up because focus return failed.

Why focus return fails:

1. In `src/components/conversations/MessageCard.tsx`, the `<AlertDialog>` (line 764) lives **inside** `MessageCard`'s own JSX. The trigger that opened it (the dropdown item in the same card, line ~553) also lives inside `MessageCard`.
2. When the user clicks Delete, the handler does `setShowDeleteConfirm(false)` and then `await deleteNote(...)`. The mutation's `onSuccess` invalidates the messages query. React Query refetches, the deleted message disappears from the list, and `MessageCard` **unmounts entirely** — taking the AlertDialog and its focus-return target with it.
3. Radix's cleanup runs, fails to find the original trigger element, and never removes the body lock styles. Page freezes.
4. `MobileChatBubble.tsx` has the exact same shape (dialog at line 249 inside a per-message component that gets unmounted).
5. `ChatMessagesList.tsx` already hoists the dialog to the list level (line 426), so it's structurally safe — but its handler also does `await deleteNote(...)` on the same tick as `setConfirmDeleteId(null)`, which still races with the cache invalidation.
6. `CustomerNotes.tsx` is structurally already correct (dialog hoisted), but its handler runs the unmount and dialog close in the same synchronous batch.

### Bug 1 — Cannot select a team member in @mention dropdown (real cause)

The Radix Popover and the manual click-outside listener that the user described are **already gone**. Today, `MentionTextarea` renders a plain inline panel as `position: absolute` inside `<div className="relative">`, with `z-[10050]` and `onMouseDown={(e) => e.preventDefault()}`.

That setup is correct for click-handling. What is breaking it today is **clipping by ancestor containers**:

- The `<div className="relative">` wrapper passes `overflow` clipping from ancestors (Card content, `ScrollArea` viewport, message bubble with `overflow-hidden`, mobile bubble flex column with `max-w-[280px]`).
- The note composer in `MessageCard` and the inline editor in `ChatMessagesList`/`MobileChatBubble` are rendered inside elements whose `overflow:hidden` clips the absolutely-positioned panel.
- Result: the panel either renders clipped (only the top sliver is hittable) or its hit-area is squeezed to zero in tight rows. Clicks on member names land on whatever is behind/around the clipped panel, never on the button.

Diagnostic capture listener at lines 57-72 is harmless but noisy and should be removed.

### Fix plan

#### A. Restore portal-based mention panel (fixes Bug 1 properly)

Edit `src/components/ui/mention-textarea.tsx`:

1. Render the suggestion panel into `document.body` via `createPortal`. This eliminates ancestor `overflow:hidden` and stacking-context clipping forever.
2. Position the portaled panel using the textarea's `getBoundingClientRect()` plus the existing caret offsets, recomputed on `scroll` and `resize` while open.
3. Keep the existing plain `<button>` list, the `onMouseDown={e.preventDefault()}` to retain textarea focus, and the existing keyboard handlers (ArrowUp/Down/Enter/Tab/Escape).
4. Remove the diagnostic outside-pointer capture listener (current lines 57-72) — it is no longer informative and adds work on every pointer event while open.
5. Keep `data-mention-panel="true"` on the panel root so any future outside-click detector can opt out.
6. No new dependencies. `createPortal` is already in `react-dom`.

Why this fixes the bug: the panel is appended to `<body>` so no ancestor can clip it; the panel sits above all stacking contexts naturally; clicks land on the actual `<button>`; `handleSelectMember` runs.

#### B. Make the note-delete flow tolerate trigger unmount (fixes Bug 2 properly)

Two changes per affected component, plus one shared sequencing rule.

**B1. Hoist the AlertDialog out of per-message components.**

- `src/components/conversations/MessageCard.tsx`: remove the inline `<AlertDialog>` (lines 763-end). Instead, expose the request to delete via a callback prop `onRequestDeleteNote(messageId)` that the parent already wiring `MessageCard` will handle. The dropdown item simply calls `onRequestDeleteNote(message.id)`.
- The parent that renders `MessageCard` (the message thread/list view) gets a single hoisted `<AlertDialog>` at its top level, controlled by a `confirmDeleteId` state, mirroring how `ChatMessagesList` already does it. We add the dialog and state to that parent.
- `src/components/mobile/conversations/MobileChatBubble.tsx`: same refactor — replace the inline `<AlertDialog>` with an `onRequestDeleteNote` callback. The mobile chat list component that renders these bubbles owns one hoisted dialog.

This guarantees that when the deleted message unmounts, the dialog and its focus-return target remain mounted at the list level, so Radix's cleanup completes and the body lock is removed.

**B2. Standard delete handler sequence everywhere.**

In every hoisted dialog's confirm handler (the lists for `MessageCard`/`MobileChatBubble`, the existing `ChatMessagesList`, and `CustomerNotes`), use this exact ordering:

```ts
const handleConfirm = () => {
  const idToDelete = confirmDeleteId;
  setConfirmDeleteId(null);          // close dialog first (sync)
  if (!idToDelete) return;
  // Defer mutation by one tick so Radix finishes its close + focus-return
  // BEFORE the query invalidation unmounts anything.
  setTimeout(() => {
    void deleteNote(idToDelete, conversationId);
  }, 0);
};
```

This belt-and-suspenders ordering guarantees:
- Dialog closes synchronously
- React flushes the close
- Radix completes focus-return and removes body lock
- Then the mutation fires; its cache invalidation only unmounts rows AFTER the dialog is fully gone

Apply to: `ChatMessagesList.tsx`, the parent that hoists the dialog for `MessageCard`, the parent for `MobileChatBubble`, and `CustomerNotes.tsx`.

#### C. Audit pass for latent instances

Confirmed via grep already:

- Manual click-outside listeners outside Radix primitives: 2 hits, both unrelated to notes/mentions and both correct in their own context (`TagMultiSelect.tsx`, `AddressSearchBlock.tsx`). No change.
- AlertDialog inside `.map()`: only the two we are fixing (`MessageCard`, `MobileChatBubble`). `CustomerNotes` and `ChatMessagesList` are already hoisted.

#### D. Cleanup

- Remove the now-unused `scheduleInteractionLockWatchdog` calls from the delete paths once the freeze is gone (keep the helper file in `src/utils/noteInteractionDebug.ts` for future use, gated by `VITE_NOTE_DEBUG`).
- Keep the `noteDebug` lifecycle logs — they are gated and quiet by default.

### Files changed

- `src/components/ui/mention-textarea.tsx` — portal the panel, drop the diagnostic capture listener.
- `src/components/conversations/MessageCard.tsx` — remove inline `<AlertDialog>`, expose `onRequestDeleteNote`.
- `src/components/mobile/conversations/MobileChatBubble.tsx` — remove inline `<AlertDialog>`, expose `onRequestDeleteNote`.
- The two parent components that render `MessageCard` and `MobileChatBubble` — add hoisted `<AlertDialog>` + `confirmDeleteId` state + the standard handler sequence. (Identified during implementation; confirmed they exist as the message list views in the conversation route.)
- `src/components/conversations/ChatMessagesList.tsx` — adopt the standard handler sequence (close dialog, then `setTimeout(0)` mutation).
- `src/components/dashboard/CustomerNotes.tsx` — adopt the standard handler sequence.

No DB changes. No new dependencies. No styling changes. No mention/notification logic changes.

### Verification

1. Open a conversation with internal notes.
2. Type `@to` in a new note in the bottom composer:
   - Dropdown appears, fully visible, not clipped, even when composer is in a small/scrolling container.
   - Clicking a name inserts `@[Name] `; popover closes; textarea keeps focus.
   - Arrow keys + Enter + Tab also select; Escape closes.
3. Open the dropdown menu on an existing internal note → Edit → type `@` → same as above.
4. Repeat in the live chat composer (`ChatReplyInput`) — Enter while menu open does NOT send.
5. Repeat in `CustomerNotes` (sidebar) — same behavior.
6. Click trash on an internal note → confirm:
   - Dialog closes, note disappears one tick later, page is fully clickable.
   - Inspect `<body>` in DevTools: no `data-scroll-locked`, no `pointer-events:none`, no orphan `data-radix-focus-guard` siblings.
   - Immediately click another note's trash, edit a note, navigate routes — all work.
7. Delete the **last** internal note in a thread: list collapses cleanly, page stays interactive.
8. Repeat the delete test on mobile (`MobileChatBubble`).
9. Repeat the delete test in `CustomerNotes`.

