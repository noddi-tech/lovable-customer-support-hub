

# AI Email Draft — Frontend Implementation

## Overview

Add visual distinction and action buttons for AI-generated draft replies (`sender_type = 'ai_draft'`) that already appear in the conversation via Realtime. Four files need changes.

## Changes

### 1. `src/lib/normalizeMessage.ts` — Recognize AI drafts

- Expand `authorType` type to include `'ai_draft'`
- If `rawMessage.sender_type === 'ai_draft'`, set `authorType = 'ai_draft'`
- Treat `ai_draft` as `'outbound'` direction
- Update `NormalizedMessage` interface accordingly

### 2. `src/components/conversations/MessageCard.tsx` — AI draft styling + action buttons

**Styling:** emerald green, dashed border, Bot icon badge:
- `border-l-4 border-dashed border-emerald-400`, `bg-emerald-50/30`
- "AI Draft" badge with Bot icon in header

**Props** — add three optional callbacks:
- `onSendDraft?: (messageId: string) => void`
- `onEditDraft?: (messageId: string, content: string) => void`
- `onDismissDraft?: (messageId: string) => void`

**Action buttons** at bottom of draft cards:
- **Send** (emerald primary) → `onSendDraft`
- **Edit** (outline) → `onEditDraft` with content
- **Dismiss** (ghost, red) → `onDismissDraft`

AI drafts always render expanded. Hide normal dropdown menu actions for drafts.

### 3. `src/contexts/ConversationViewContext.tsx` — Draft action methods

**`sendDraft(messageId)`:**
1. Read draft content from messages state
2. Call the existing `sendReply()` flow with the draft content — do NOT create a parallel send path via raw insert. "Send" on an AI draft must behave identically to an agent manually typing and sending the same text.
3. Delete the draft from DB
4. Track in `response_tracking` with `response_source='ai_draft'`, `was_edited=false`

**`editDraft(messageId)`:**
1. Pre-fill reply composer with draft content (dispatch SET_REPLY_TEXT + SET_SHOW_REPLY_AREA)
2. Delete/hide the draft from DB
3. Set state to track origin for `response_tracking` with `was_edited=true`

**`dismissDraft(messageId)`:**
1. Delete draft from DB
2. Invalidate message queries

### 4. `src/components/conversations/ProgressiveMessagesList.tsx` — Wire callbacks

- Import `useConversationView` to get `sendDraft`, `editDraft`, `dismissDraft`
- Pass as props to `MessageCard` instances

## Edge cases

- If no `ai_draft` message exists in a conversation, everything renders normally — no empty states or placeholder UI needed
- If the draft generation is slow (5-10s after email arrives), the draft will simply pop in via Realtime when ready
- If the agent has already started typing a reply before the draft appears, don't interrupt their work — the draft just appears above as an option they can use or ignore

## Files to change

- `src/lib/normalizeMessage.ts`
- `src/components/conversations/MessageCard.tsx`
- `src/contexts/ConversationViewContext.tsx`
- `src/components/conversations/ProgressiveMessagesList.tsx`

