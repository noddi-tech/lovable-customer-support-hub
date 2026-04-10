

# Fix Browser Back Button for Conversation Navigation

## Problem
When you click a conversation from the inbox list, the URL updates with `?c=conversationId` using `replace: true`, which **overwrites** the current browser history entry instead of creating a new one. So the back button skips over conversation selections entirely.

## Root Cause
In `useInteractionsNavigation.tsx`, line 97: `setSearchParams(newParams, { replace: true })` and line 164: `setSearchParams(newParams, { replace: true })`. Both the general `updateNavigation` and the thread-specific `openConversation` use `replace: true`.

## Fix
Change `openConversation` to **push** a new history entry (not replace), so the back button returns to the previous state (inbox list without `?c=`). Keep `replace: true` for other param updates (search, inbox changes) to avoid polluting history.

### Changes

**`src/hooks/useInteractionsNavigation.tsx`**:
1. In `openConversation` (~line 164): change `setSearchParams(newParams, { replace: true })` to `{ replace: false }`
2. In `updateNavigation` (~line 97): when the update includes a `conversationId` change, use `replace: false`; otherwise keep `replace: true`

Specifically, update `updateNavigation` to accept an optional `push` flag, and have `openConversation` pass `push: true`. Alternatively, simpler: just change `openConversation` to use `navigate()` with `replace: false` directly instead of going through `updateNavigation`.

**`src/components/dashboard/InteractionsLayout.tsx`** (~line 167):
- Change `setSearchParams(newParams, { replace: true })` to `{ replace: false }` in `handleConversationSelect`

This way, clicking a conversation pushes a history entry, and the browser back button returns you to the inbox list view.

