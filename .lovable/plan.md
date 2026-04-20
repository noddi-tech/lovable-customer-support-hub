
## Plan: Add targeted note-interaction diagnostics and clean up console noise

### Goal

Add low-noise bug tracking so the next reproduction clearly shows why:

1. clicking a team member in `@mention` suggestions fails
2. deleting a note can leave the screen non-interactive

This plan focuses on instrumentation first, using the project’s existing logging system instead of more raw `console.log` spam.

### What to build

#### 1) Clean up the existing noisy console output
Reduce unrelated log spam so note diagnostics are actually visible.

**Changes**
- Replace/remove the raw polling logs in `src/contexts/ConversationViewContext.tsx`:
  - `Fetching messages for conversation: ...`
  - `Messages fetched: ...`
- Route any useful remaining fetch diagnostics through `logger.debug(..., 'ConversationViewContext')` so deduplication works.
- Replace note-related `console.error(...)` calls in `src/hooks/useNoteMutations.ts` with `logger.error(...)`.

**Why**
The current 2-second message polling is flooding the console and burying the actual note interaction signals.

---

#### 2) Add a dedicated note diagnostics helper
Create a small shared helper for targeted note debugging, gated behind an env flag.

**New file**
- `src/utils/noteInteractionDebug.ts`

**Behavior**
- Only logs when a dedicated flag is enabled, e.g. `VITE_NOTE_DEBUG=1`
- Uses the centralized logger, not raw console
- Emits compact structured events like:
  - `mention_menu_opened`
  - `mention_item_mouse_down`
  - `mention_item_clicked`
  - `mention_insert_started`
  - `mention_insert_finished`
  - `note_editor_open_requested`
  - `delete_dialog_open_requested`
  - `delete_dialog_open_changed`
  - `delete_confirm_clicked`
  - `delete_mutation_started`
  - `delete_mutation_finished`
  - `interaction_lock_detected`

**Each event should include**
- component name
- conversation ID / message ID when available
- active element tag/class
- whether mention menu is open
- whether delete dialog is open
- filtered member count / active index for mentions
- body lock snapshot:
  - `document.body.style.pointerEvents`
  - `document.body.style.overflow`
  - remaining fixed overlays in DOM
  - focused element after close

---

#### 3) Instrument the shared mention flow at the source
Add precise lifecycle tracking inside `src/components/ui/mention-textarea.tsx`.

**Track**
- detection of `@` trigger and menu open/close
- current query and result count
- active suggestion index changes
- `ArrowUp` / `ArrowDown` / `Enter` / `Tab` / `Escape`
- suggestion `onMouseDown`
- suggestion `onClick`
- `handleSelectMember(...)` start/end
- textarea selection start/end before and after insertion
- focus restoration after insertion

**Extra diagnostic hook**
- while the mention menu is open, attach a temporary capture listener for outside pointer events and log:
  - event target
  - whether target was inside textarea
  - whether target was inside the mention panel
  - topmost element under the pointer if useful

**Why**
If the click is being swallowed, closed early, or losing focus before insertion, this will show exactly where.

---

#### 4) Instrument the note editor open path
Track how note editing is entered in all note UIs.

**Files**
- `src/components/conversations/MessageCard.tsx`
- `src/components/conversations/ChatMessagesList.tsx`
- `src/components/mobile/conversations/MobileChatBubble.tsx`
- `src/components/conversations/InlineNoteEditor.tsx`

**Track**
- dropdown action selected
- whether edit/delete was triggered from `onClick` or `onSelect`
- deferred `setTimeout(...)` open request
- actual editor mount/unmount
- actual dialog open/close
- focus target immediately after editor opens

**Important consistency fix included with diagnostics**
- In `MessageCard.tsx`, align “Edit note” opening with the safer deferred dropdown-close pattern already used elsewhere, then log that lifecycle.
- This is a low-risk consistency change that prevents the diagnostics from being polluted by different open behavior across views.

---

#### 5) Instrument delete flow and detect stuck interaction locks
Add post-delete freeze diagnostics around the confirmation dialog lifecycle.

**Files**
- `src/components/conversations/MessageCard.tsx`
- `src/components/conversations/ChatMessagesList.tsx`
- `src/components/mobile/conversations/MobileChatBubble.tsx`
- `src/hooks/useNoteMutations.ts`

**Track**
- delete menu item selected
- dialog open state changes
- confirm button click
- dialog close before mutation
- delete mutation start/success/failure
- cache invalidations
- a short post-close watchdog (for example next tick + small delayed check) that records whether the page is still locked

**Watchdog snapshot should capture**
- whether any Radix overlay/content remains mounted
- whether body styles still imply a lock
- whether a full-screen fixed element is covering the viewport
- current active element after dialog close

**Why**
The session replay shows the dialog closes and toast appears, but the app can still behave as if an invisible layer remains. This tracking will confirm whether the freeze is a pointer-lock/overlay problem or something else.

---

#### 6) Keep live-chat send behavior visible during mention debugging
Add lightweight diagnostics in `src/components/conversations/ChatReplyInput.tsx` for the internal-note composer.

**Track**
- mention menu open/close received from `MentionTextarea`
- Enter key blocked because mention menu is open
- Enter key sent message because menu is closed

**Why**
This verifies whether note mention selection is being interrupted by parent key handlers in chat-specific flows.

### Files touched

- `src/contexts/ConversationViewContext.tsx`
- `src/utils/noteInteractionDebug.ts` (new)
- `src/components/ui/mention-textarea.tsx`
- `src/components/conversations/InlineNoteEditor.tsx`
- `src/components/conversations/ChatReplyInput.tsx`
- `src/components/conversations/MessageCard.tsx`
- `src/components/conversations/ChatMessagesList.tsx`
- `src/components/mobile/conversations/MobileChatBubble.tsx`
- `src/hooks/useNoteMutations.ts`

### Technical details

- Use `logger.debug/info/warn/error`, not new raw `console.log`
- Gate all new diagnostics behind `VITE_NOTE_DEBUG=1`
- Keep logs structured and deduplicated
- No database changes
- No user-facing UI changes except safer edit opening consistency in `MessageCard`

### Verification

1. Start with:
   - `VITE_LOG_LEVEL=DEBUG`
   - `VITE_NOTE_DEBUG=1`
2. Reproduce mention selection in:
   - regular note add
   - note edit
   - live chat internal note
3. Confirm the console now shows:
   - menu opened
   - item mouse down
   - item click
   - insertion start/end
   - focus after insertion
4. Reproduce note deletion freeze in:
   - `MessageCard`
   - `ChatMessagesList`
   - mobile note bubble if applicable
5. Confirm the logs show:
   - dropdown select
   - dialog open
   - confirm click
   - dialog close
   - delete success
   - post-close body/overlay snapshot
6. Use the captured sequence to identify the remaining root cause and then apply a focused fix in a follow-up step.

