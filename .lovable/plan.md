

## Add Archive Confirmation Dialog with "Also Close?" Option

### Current behavior
All archive actions (single, bulk, header) force `status: 'closed'` alongside `is_archived: true` — no confirmation, no choice.

### Desired behavior
When archiving conversations that aren't already closed, show a modal asking: "Do you also want to close these conversations?" with options:
- **Archive & Close** — sets `is_archived: true` + `status: 'closed'`
- **Archive Only** — sets `is_archived: true`, keeps current status
- **Cancel**

If all selected conversations are already closed, skip the modal and archive immediately.

### Changes

**1. New component: `src/components/dashboard/conversation-list/ArchiveConfirmDialog.tsx`**
- Alert dialog with title "Archive conversations"
- Message: "X of Y selected conversations are not closed. Would you like to close them as well?"
- Three buttons: Cancel, Archive Only, Archive & Close
- Props: `open`, `onOpenChange`, `nonClosedCount`, `totalCount`, `onArchiveOnly`, `onArchiveAndClose`

**2. `src/contexts/ConversationListContext.tsx`**
- Add state for archive dialog: `archiveDialog: { open, ids, hasNonClosed }` 
- Update `archiveConversation(id)`: check if conversation status !== 'closed' → open dialog; otherwise archive directly
- Update `bulkArchive()`: check how many selected are not closed → if any, open dialog; otherwise archive directly
- Add `confirmArchive(alsoClose: boolean)` that performs the actual archive with or without status change
- Expose dialog state + confirm function in context

**3. `src/components/dashboard/ConversationList.tsx`**
- Render `<ArchiveConfirmDialog>` using context state
- Wire up the three callbacks

**4. `src/components/dashboard/conversation-view/ConversationHeader.tsx`**
- Update `handleArchive` to check `conversation.status !== 'closed'` before archiving
- If not closed, show same confirmation (can use a local state + the same dialog component)

| File | Change |
|------|--------|
| `ArchiveConfirmDialog.tsx` | New dialog component |
| `ConversationListContext.tsx` | Add archive dialog state, check status before archiving |
| `ConversationList.tsx` | Render archive dialog |
| `ConversationHeader.tsx` | Add confirmation before archive when not closed |

