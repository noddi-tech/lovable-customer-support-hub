

## Plan: Replace cmdk with plain list for reliable mention selection (everywhere)

### Scope confirmation

Yes — the fix lives entirely in `src/components/ui/mention-textarea.tsx`, which is the shared component used by **all** mention inputs:

- Inline note editor (chat + email + mobile) — `InlineNoteEditor`
- Customer notes — `CustomerNotes`
- Live chat composer — `ChatReplyInput`
- Ticket comments — `TicketCommentsList`
- Call notes — `CallNotesSection`
- Quick note widget and any other consumer

So fixing `MentionTextarea` fixes mention selection for regular (new) notes, edited notes, chat notes, customer notes, and ticket comments — all in one shot.

### Root cause (recap)

`MentionTextarea` wraps the suggestion list in `cmdk` (`Command` / `CommandItem`) inside a portaled Radix Popover. cmdk expects to own keyboard input via its own `CommandInput`, but here a separate `<textarea>` is the input — so `cmdk` never receives `Enter` / arrows, and its internal selection state stays inconsistent, which also makes mouse `onSelect` fire unreliably. Net effect: clicking or pressing Enter on a suggested team member silently does nothing.

### Fix (single file: `src/components/ui/mention-textarea.tsx`)

1. **Remove cmdk.** Drop the `Command`, `CommandList`, `CommandEmpty`, `CommandGroup`, `CommandItem` imports and JSX.
2. **Render a plain controlled list** of suggestions inside the existing Radix `PopoverContent`:
   - Header label "Team Members".
   - One `<button type="button">` per member (avatar + name + email), max 8 items.
   - Empty state: "Loading team members..." or "No team members found".
3. **Add `activeIndex` state** for keyboard highlight. Reset to `0` whenever `mentionState.searchQuery` or `filteredMembers` changes.
4. **Own all keys in the textarea's `onKeyDown`** while the popover is open and there are matches:
   - `ArrowDown` → `activeIndex = (i + 1) % len`, `preventDefault` + `stopPropagation`.
   - `ArrowUp` → `activeIndex = (i - 1 + len) % len`, `preventDefault` + `stopPropagation`.
   - `Enter` → `handleSelectMember(filteredMembers[activeIndex])`, `preventDefault` + `stopPropagation` (so parent send/save handlers don't fire).
   - `Escape` → close popover only, `preventDefault` + `stopPropagation`.
   - When popover is closed, pass through to the consumer's `onKeyDown` unchanged (so Cmd/Ctrl+Enter save and chat-send shortcuts keep working).
5. **Stable mouse selection** on each suggestion button:
   - `onMouseDown={(e) => e.preventDefault()}` to keep the textarea focused.
   - `onClick={() => handleSelectMember(member)}` — direct call, no library indirection.
   - `onMouseEnter={() => setActiveIndex(index)}` for hover highlight parity with keyboard.
6. **Keep existing pieces**: Popover anchor / caret positioning, `onInteractOutside` that ignores clicks on the textarea, `onOpenAutoFocus={(e) => e.preventDefault()}`, and the existing `handleSelectMember` insertion logic (with the `triggerIndex` fallback already in place).

No other files change. No DB changes. All consumers inherit the fix.

### Verification

1. Open a conversation, click **Add note** (or **Edit note**).
2. Type `@to`:
   - **Click** "Tom Arne Danielsen" → `@[Tom Arne Danielsen] ` is inserted, popover closes, note is not saved.
   - Or press **Enter** → same result.
   - Or use **Arrow keys** + **Enter** → same result.
3. Press **Escape** while menu is open → menu closes, editor stays open.
4. Press **Cmd/Ctrl + Enter** (menu closed) → note saves as before.
5. Repeat in **live chat composer** (plain Enter selects mention, does NOT send the chat message; Enter alone with menu closed sends as before).
6. Repeat in **CustomerNotes**, **TicketCommentsList**, and **CallNotesSection** — selection works in all of them.

