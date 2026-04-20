

## Plan: Fix screen freeze after deleting a note

### Root cause

Two issues combine to freeze the UI after a note deletion:

1. **AlertDialog rendered inside ScrollArea** (lines 404-427 inside the `<ScrollArea>` that closes at line 428). When the delete succeeds, the messages array changes, React re-renders the list, and the AlertDialog's portal overlay can become orphaned — leaving an invisible overlay that blocks all clicks.

2. **2-second polling keeps firing** during edit/delete operations (lines 62-76). This triggers re-renders while the AlertDialog or InlineNoteEditor is open, which can unmount and remount the dialog mid-transition, leaving the backdrop stuck.

### Fix

**`src/components/conversations/ChatMessagesList.tsx`**

1. **Move AlertDialog outside ScrollArea.** Place it as a sibling after `</ScrollArea>`, wrapped in a fragment. This ensures the dialog portal lifecycle is independent of the scroll container's re-renders.

2. **Pause polling while editing or confirming delete.** Change the 2-second interval to skip invalidation when `editingNoteId` or `confirmDeleteId` is set:
   ```
   if (editingNoteId || confirmDeleteId) return; // inside the interval callback
   ```

3. **Reset `confirmDeleteId` before the async delete, not after.** Currently the state is cleared after `await deleteNote(...)`, but the re-render from cache invalidation can race. Clear it first, then delete:
   ```
   const idToDelete = confirmDeleteId;
   setConfirmDeleteId(null);
   if (idToDelete) await deleteNote(idToDelete, conversationId);
   ```

### Files touched

- `src/components/conversations/ChatMessagesList.tsx` — move AlertDialog, pause polling, fix state reset order.

No database changes. No other files affected.

### Verification

1. Open the conversation, click **Delete note** on an internal note.
2. Confirm deletion in the dialog.
3. Note disappears, screen remains fully interactive — no freeze.
4. Edit a note with `@mentions`, confirm the suggestion popover works during editing (no polling interference).
5. Verify normal message polling resumes after closing the editor.

