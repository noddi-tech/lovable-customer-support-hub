

## Plan: Edit + delete internal notes (chat & email)

You should be able to fix a typo'd `@mention` (or any text) in an internal note, and remove a note entirely — from both chat and email conversation views, on desktop and mobile. Right now:

- **Email view**: the "Edit Message" menu item dispatches state but nothing reads it, so clicking does nothing. Delete is hidden for notes (only shown for failed outgoing emails).
- **Chat view**: notes only show "Copy" / "Resend Email" — no edit, no delete. (Matches your screenshot.)
- **Mobile chat bubble**: no actions at all on notes.

### Scope (internal notes only)

Edit/delete will be permitted on `is_internal === true` messages **authored by the current user** (or any note for org admins). Customer messages and successfully-sent agent emails remain protected per the existing deletion policy — only the internal-note carve-out is added.

### What you'll see after the fix

1. **Three-dot menu on any internal note** (chat bubble, email card, mobile bubble) shows:
   - Copy
   - **Edit note** ✨ new
   - **Delete note** ✨ new (with confirmation)

2. **Edit mode** transforms the note bubble into an inline `MentionTextarea` pre-filled with the original content, with **Save** / **Cancel** buttons. `@` autocomplete works, so you can finish the `@tom` tag, press the suggestion, and Save.
   - Saving updates `messages.content`, recomputes mention metadata, fires notifications for **newly added** mentions only (no duplicate alerts to people already tagged), stamps `updated_at`, and shows an "(edited)" marker next to the timestamp.

3. **Delete** opens a confirm dialog ("Delete this internal note? This cannot be undone."), removes the row, and refreshes the conversation. No `updated_at` bump on the conversation (per the timestamp integrity rule).

### Implementation map

**New shared hook** `src/hooks/useNoteMutations.ts`
- `updateNote({ messageId, content, mentionedUserIds })` — updates `messages` row, processes new mentions via existing `useMentionNotifications`, invalidates `conversation-messages` / `thread-messages` caches.
- `deleteNote(messageId)` — deletes `messages` row, invalidates caches, no conversation `updated_at` change.
- Permission check: `is_internal === true` AND (`sender_id === currentProfileId` OR caller is org admin).

**New inline editor** `src/components/conversations/InlineNoteEditor.tsx`
- `MentionTextarea` + Save/Cancel buttons, pre-filled with original content + extracted mention IDs. Enter to save, Esc to cancel. Reused by all three views below.

**Email view — `MessageCard.tsx`**
- Add `isEditingThisNote` local state; when true, render `InlineNoteEditor` in place of `MentionRenderer`.
- Show "Edit note" + "Delete note" menu items when `isInternalNote && canEdit`. Remove dependency on the unused context dispatch.
- Add small "(edited)" badge next to timestamp when `updated_at > created_at` for notes.

**Chat view — `ChatMessagesList.tsx`**
- Add "Edit note" / "Delete note" items to the dropdown when `isInternal && canEdit`.
- Render `InlineNoteEditor` inside the yellow bubble when editing.
- Add small AlertDialog for delete confirmation.

**Mobile — `MobileChatBubble.tsx`**
- Add long-press / three-dot trigger on internal notes that opens a sheet with Edit / Delete / Copy.
- Reuse `InlineNoteEditor`.

**Cleanup**
- Remove the orphaned `editingMessageId` / `editText` from `ConversationViewContext` (or wire it to the new editor — we'll just remove since the new flow is local-state driven and simpler).

### Permissions & safety

- RLS on `messages` already restricts updates/deletes to org members. We add an app-level guard: only the note's author (`sender_id`) or an admin can see Edit/Delete.
- Customer messages, outbound emails, and AI drafts are **unaffected** — no new delete paths for them.
- Mention re-processing only sends notifications to user IDs added in the edit (compare new vs old mentioned IDs).

### Verification steps

1. In the conversation in your screenshot, hover the "vet du noe om dette @tom" note → three-dot menu → **Edit note**.
2. Inline editor opens with the text. Type `@to` → suggestion appears → press Enter to insert `@[Tom Lastname]`. Click **Save**.
3. Bubble shows the rendered mention chip; "(edited)" appears next to "Just now". Tom receives a mention notification.
4. Open menu again → **Delete note** → confirm → bubble disappears.
5. Repeat in the email-style thread view (long email conversation with an internal note) and on mobile.
6. Confirm Edit/Delete do **not** appear on customer messages, sent agent emails, or notes authored by other users (unless you're admin).

