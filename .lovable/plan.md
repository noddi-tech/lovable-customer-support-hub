

# Refactor: Conversation as a URL Resource

## Current state
Conversations live in query params: `/interactions/text/open?c=abc123`. The "open/active/ended" filter is part of the path, and the conversation is just a param. This breaks REST conventions and causes back-button issues.

## New URL model

```text
List views (no conversation selected):
  /interactions/text/open          → text inbox, "open" filter
  /interactions/text/closed        → text inbox, "closed" filter
  /interactions/chat/active        → chat, "active" filter

Conversation views (resource URL):
  /interactions/text/conversations/abc123        → view conversation abc123
  /interactions/chat/conversations/abc123        → view chat conversation abc123
  /interactions/text/conversations/abc123?m=msg1 → deep-link to message

Short links (unchanged):
  /c/abc123                        → redirect to correct resource URL
```

The filter (open/closed/active/ended) is **not** in the conversation URL — it's UI state for the list, not a property of the resource link. The `?inbox=` param stays as a query param for list filtering.

## Changes

### 1. Routes — `App.tsx`
Add conversation resource routes before the filter routes:
```
/interactions/text/conversations/:conversationId
/interactions/chat/conversations/:conversationId
```
Keep existing filter routes unchanged for list views.

### 2. `ConversationRedirect.tsx`
Update target path from `?c=id` to `/conversations/id`:
```
/interactions/text/conversations/abc123
/interactions/chat/conversations/abc123
```

### 3. `useInteractionsNavigation.tsx`
- `openConversation()`: use `navigate('/interactions/text/conversations/{id}')` (push)
- `backToList()`: use `navigate(-1)` or navigate to the list path
- `getCurrentState()`: read `conversationId` from `useParams()` instead of `searchParams.get('c')`
- Remove all `?c=` query param logic

### 4. `InteractionsLayout.tsx`
- Read `conversationId` from `useParams()` instead of `searchParams.get('c')`
- `handleSelectConversation`: navigate to `/interactions/text/conversations/{id}`
- Mobile back: `navigate(-1)` or navigate to list path
- Remove all `newParams.set('c', ...)` / `newParams.delete('c')` logic

### 5. `EnhancedInteractionsLayout.tsx`
- Uses `navigation.openConversation()` — no direct `?c=` logic, inherits fix from hook

### 6. `ChatLayout.tsx`
- `handleSelectChat`: `navigate('/interactions/chat/conversations/{id}')`
- `handleBack`: `navigate('/interactions/chat/${currentFilter}')`
- Remove `searchParams.get('c')`

### 7. `LiveChatQueue.tsx`
- Change `navigate('/interactions/chat/active?c=${id}')` to `navigate('/interactions/chat/conversations/${id}')`

### 8. Back handlers (4 files)
- `ConversationView.tsx` — Escape key handler: `navigate(-1)`
- `ConversationViewContent.tsx` — back button: `navigate(-1)`
- `MobileEmailConversationView.tsx` — back: `navigate(-1)`
- `MobileChatConversationView.tsx` — back: `navigate(-1)`

### 9. `InboxList.tsx`
- Remove `newParams.delete('c')` — no longer needed since conversation is in path, not params

### 10. `URLSanitizer.tsx`
- Add migration: if URL contains `?c=`, redirect to `/conversations/{id}` path

### 11. Index.tsx / page rendering
- When route matches `/interactions/text/conversations/:conversationId`, render the same layout but with conversation pre-selected from params

### 12. Tests
- Update `useInteractionsNavigation.test.ts` to use path-based conversation IDs

## What stays the same
- `/c/:conversationId` short links (just updated redirect target)
- `?inbox=`, `?m=`, `?q=` query params (these are filters/state, not resources)
- Filter routes (`/interactions/text/open`, `/interactions/chat/active`)
- All component rendering logic — only navigation/URL-reading changes

## Back button behavior (free)
Since `navigate()` pushes by default, clicking a conversation creates a history entry. Browser back returns to the list. No more `replace: true/false` juggling.

