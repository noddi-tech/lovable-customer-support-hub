

## Declutter Message Cards + Fix Note Attribution + Compact Header

### Problem Summary (from screenshots)

1. **Too much name repetition**: Each message shows full name like "'Hanne Blaasvær Stangnes' via Hei" when the customer name is already in the conversation header -- redundant clutter
2. **Avatar shows wrong initial**: Customer avatar shows `'` (first char of `'Hanne...`) instead of proper initials like "HB". Agent avatar shows single letter instead of initials
3. **Note shows wrong author**: Internal notes show "H" avatar and "hei@noddi.no" because `sender_id` is null in DB -- should show actual note creator's name
4. **Header too large**: Avatar is `h-14 w-14`, name is `text-xl` -- wastes vertical space. Subject is in a separate centered column instead of inline with customer info

---

### Change 1: Remove name from message rows, put name INSIDE the badge

**File: `src/components/conversations/MessageCard.tsx`** (lines 352-365)

Currently the header row shows: `[Avatar] [Timestamp] [Full Name] [Customer badge]`

Change to: `[Avatar] [Timestamp] [Customer: Hanne B.S. badge] [preview...]`

- For **customer messages**: The badge text changes from "Customer" to the customer's shortened name (e.g., "Hanne B.S." or first name). Remove the separate name `<span>` entirely.
- For **agent messages**: The badge text changes from "You" to the agent's first name (e.g., "Robert"). Remove the separate name `<span>`.
- For **notes**: Keep "Note" badge as-is, but add the author's name next to it (e.g., "Note" badge + "Joachim R." text)

This dramatically reduces the visual noise per row since the customer name is already in the header.

Add a helper function `shortName(fullName)` that returns first name + last initial (e.g., "Hanne Blaasvær Stangnes" becomes "Hanne B.S.", "Robert Pinar" becomes "Robert P.").

---

### Change 2: Fix avatar initials to use multi-letter initials

**File: `src/components/conversations/MessageCard.tsx`** (line 196)

Current: `const initial = (message.from.name?.[0] ?? message.from.email?.[0] ?? '•').toUpperCase();`

This takes only the first character, which for the name `'Hanne Blaasvær Stangnes' via Hei` gives `'` (the quote character).

Replace with the existing `initials()` helper (already defined at line 45-50) which splits on spaces/dots/hyphens and takes first char of each part. Also strip leading quotes/apostrophes from the name before computing initials.

**File: `src/lib/normalizeMessage.ts`** (line 408)

Same fix for `avatarInitial` -- use multi-char initials instead of single char. Also strip the `'...' via Hei` pattern from customer names before computing initials.

---

### Change 3: Fix note author attribution

**Problem**: Notes in DB have `sender_id: null`, so `senderProfile` is null, and the fallback shows inbox email `hei@noddi.no`.

Two fixes:

**File: `src/contexts/ConversationViewContext.tsx`**: Verify the insert path always includes `sender_id: user.id` for notes (it does at line 338 -- but check the edge function path too).

**File: `src/lib/normalizeMessage.ts`** (lines 316-319, 374-395): When `is_internal === true` and no `senderProfile` exists, the current fallback goes to email headers which contain `hei@noddi.no` (the inbox email). Fix: for internal notes with no profile, fall back to a stored `sender_name` field, or show "Agent" rather than the inbox email. Also, for the avatar, don't use the inbox email initial.

**Data fix**: Update existing notes to set `sender_id` where possible (match by `created_at` timestamp to auth audit log or conversation assignment).

---

### Change 4: Compact the conversation header

**File: `src/components/dashboard/conversation-view/ConversationViewContent.tsx`** (lines 306-404)

Current layout:
```text
[Back] [Big Avatar h-14] [Name text-xl]          [Subject centered]          [Refresh] [Expand All]
                                                   Subject: ...  (separate row)
```

New layout -- single compact row with subject inline:
```text
[Back] [Avatar h-8] [Name text-sm / email text-xs] · Subject: avlevering av dekk...   [Refresh] [Expand All]
```

Changes:
- Shrink avatar from `h-14 w-14` to `h-8 w-8`
- Shrink name from `text-xl font-bold` to `text-sm font-semibold`
- Remove the separate centered subject column
- Put subject inline with name using a flex row: `Name · email` on first line, `Subject: ...` on second line (or same line if space)
- Remove the duplicate `conversation.subject` metadata row (lines 397-404) since it's now in the header
- Reduce header padding from `p-5` to `p-3`

---

### Summary of files changed

| File | Changes |
|------|---------|
| `src/components/conversations/MessageCard.tsx` | Remove name span, put name inside badge, fix avatar to use multi-char initials, add `shortName()` helper |
| `src/lib/normalizeMessage.ts` | Fix `avatarInitial` to use multi-char initials, strip quote/via patterns from customer names, improve note author fallback |
| `src/components/dashboard/conversation-view/ConversationViewContent.tsx` | Compact header: smaller avatar, inline subject with name, remove duplicate subject row |

