
## Plan: Fix the real root causes behind both persistent note bugs

### Root causes

There are two separate interaction-layer problems:

1. **Team-member selection still fails**
   - The shared `MentionTextarea` is improved, but it still renders the suggestions inside a Radix `Popover` portal.
   - In note-edit flows, the editor is opened **directly from a Radix `DropdownMenuItem`** (`MessageCard`, `ChatMessagesList`, `MobileChatBubble`). That leaves focus/layer management competing with the newly mounted editor and its mention popup.
   - The popup also uses a relatively low z-index (`z-[150]`), while dropdown content uses `z-[10002]`, so the mention list can end up visually present but not actually clickable.
   - In live chat internal notes, `ChatReplyInput` still treats plain `Enter` as “send”, so mention selection can be interrupted even if the popup is open.

2. **Deleting a note can still freeze the screen**
   - The delete confirm is still opened **from a Radix dropdown menu item** in multiple places.
   - This matches a known Radix dropdown/dialog pointer-lock failure mode: after the confirm dialog closes, `body` can remain non-interactive.
   - `MessageCard` still closes the dialog **after** the async delete finishes, which increases the chance of a stuck interaction lock during re-render.

### What to change

#### 1) Remove Radix Popover from `MentionTextarea`
Refactor `src/components/ui/mention-textarea.tsx` so the mention menu is rendered as a **plain absolutely positioned inline panel** inside the textarea wrapper instead of using `Popover` / `PopoverContent` / portal layering.

Implementation:
- Replace Radix popover wrappers with:
  - a `relative` outer container
  - an `absolute z-[10050]` suggestion panel positioned from the computed caret coordinates
- Keep the plain `<button>` suggestion list.
- Preserve existing manual keyboard navigation:
  - `ArrowUp` / `ArrowDown`
  - `Enter`
  - `Tab`
  - `Escape`
- Keep `preventDefault()` + `stopPropagation()` while the menu is open.
- Keep focus in the textarea after selection.

Why:
- No portal
- No dismissable-layer conflicts
- No hidden overlay swallowing clicks
- Same behavior in add-note, edit-note, customer notes, tickets, and call notes

#### 2) Expose mention-menu open state to parents
Extend `MentionTextarea` with an optional prop such as:
- `onMentionMenuOpenChange?: (open: boolean) => void`

Use it so parent components know when the mention menu is active.

Apply in:
- `src/components/conversations/ChatReplyInput.tsx`
- optionally `src/components/conversations/