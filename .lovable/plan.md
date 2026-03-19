

## Current URL Structure

```text
Full view:     /interactions/text/{status}?inbox={id}&c={conversationId}&m={messageId}
Short links:   /c/{conversationId}
               /c/{conversationId}/m/{messageId}
Chat view:     /interactions/chat/{filter}  (no conversation deep-link)
Slack button:  /?inbox={id}&c={conversationId}  ← BROKEN (hits root redirect)
```

**Problems identified:**

1. **No channel distinction** — email and widget/chat conversations both resolve to `/interactions/text/`, but chat conversations live under `/interactions/chat/`. The redirect doesn't know which layout to use.
2. **Short links don't carry message type** — `/c/{id}` looks up the conversation but doesn't encode the channel, so it always redirects to `/interactions/text/`.
3. **Slack "View Conversation" button is broken** — it generates `/?inbox=...&c=...` which hits the root redirect to `/interactions/text` and loses the query params entirely.
4. **No message-level short link for Slack** — mentioning a specific message requires `/c/{id}/m/{msgId}` but Slack notifications don't use this.

## Proposed New URL Structure

```text
Short links (shareable, used by Slack, emails, etc.):
  /c/{conversationId}                    → auto-detect channel, redirect
  /c/{conversationId}/m/{messageId}      → auto-detect + scroll to message

Full view (internal, after redirect):
  /interactions/text/{status}?inbox={id}&c={conversationId}&m={messageId}
  /interactions/chat/{filter}?c={conversationId}&m={messageId}
```

The short link `/c/{id}` is the canonical shareable format. The redirect component already exists — it just needs to be smarter about routing chat vs email conversations.

## Plan

### 1. Upgrade ConversationRedirect to be channel-aware

**File:** `src/components/routing/ConversationRedirect.tsx`

- Already fetches `conversations.status` and `inbox_id`
- Add `channel` to the select query
- If `channel === 'widget' || channel === 'chat'` → redirect to `/interactions/chat/{status}?c={id}`
- Otherwise → redirect to `/interactions/text/{status}?inbox={id}&c={id}` (current behavior)
- Keep `/m/{messageId}` pass-through for both paths

### 2. Fix Slack notification URLs

**File:** `supabase/functions/send-slack-notification/index.ts`

- Line 378-381: Change URL generation from `/?inbox=...&c=...` to use the canonical short link format: `{appUrl}/c/{conversationId}` (optionally with `/m/{messageId}`)
- This is simpler, always works, and doesn't depend on knowing the current status/inbox

### 3. Add `?c=` support to ChatLayout

**File:** `src/components/dashboard/chat/ChatLayout.tsx`

- Read `c` from search params to pre-select a conversation (same pattern as InteractionsLayout)
- This enables deep-linking into chat conversations after redirect

### 4. No new routes needed

The existing `/c/:conversationId` and `/c/:conversationId/m/:messageId` routes already handle all short links. The fix is entirely in the redirect logic and URL generation.

## Technical details

- The `conversations` table already has a `channel` column — no schema changes needed
- The Slack edge function already has `conversation_id` and `channel` in its request body — it just generates the wrong URL format
- The `ConversationRedirect` query adds one column (`channel`) to an already-indexed primary key lookup — negligible performance impact

