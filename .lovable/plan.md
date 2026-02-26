

## Fix Email Thread Splitting Bug

### Problem
When a customer replies to an email thread, the webhook picks the **first** `<Message-ID>` from the `References` header as the thread key. But Outlook often puts the **most recent reply's Message-ID first** (not the original thread root). Since agent replies aren't stored with a matching `email_thread_id` in the conversation's `external_id`, each customer reply creates a new conversation.

Evidence: The "avlevering av dekk" thread split into 3 conversations with these `external_id` values -- all different Outlook Message-IDs:
- `98e53a37`: `DU2P250MB0148...` (original)
- `53504a1c`: `AM8P250MB0159...0643...` (reply 2)  
- `75a89ca0`: `AM8P250MB0159...9260...` (reply 3)

### Root Cause (two bugs)

**Bug 1 -- Webhook thread lookup is too naive:** Both `email-webhook` and `sendgrid-inbound` compute a single `threadId`/`threadKey` from the first References entry, then do `WHERE external_id = threadKey`. If that specific Message-ID was never stored as a conversation's `external_id`, it creates a new conversation.

**Bug 2 -- Agent replies don't chain back:** `send-reply-email` sets `In-Reply-To` and `References` to only the last customer's `email_message_id`. It does NOT store the conversation's `external_id` in the outgoing `References` chain. So when the customer's email client builds its own `References`, none of the IDs match the conversation's `external_id`.

### Fix

#### 1. `sendgrid-inbound/index.ts` -- Look up ALL References against existing conversations

Instead of computing one `threadKey` and doing a single `eq('external_id', threadKey)`, extract ALL Message-IDs from the References + In-Reply-To headers, then:

1. Query `conversations` WHERE `external_id IN (all_ref_ids)` for the org
2. Query `messages` WHERE `email_message_id IN (all_ref_ids)` to find conversations by message
3. If any match is found, use that conversation (merge into the oldest one if multiple matches)
4. Only create a new conversation if zero matches

Changes to `getThreadKey()` function (lines 21-64): Rename to `extractAllThreadIds()`, return an array of all cleaned Message-IDs from References, In-Reply-To, and Message-ID.

New lookup logic (lines 353-401): Replace the single `eq('external_id', threadKey)` with:

```text
1. Parse all reference IDs from headers
2. SELECT id FROM conversations WHERE external_id = ANY(ref_ids) AND org_id = ?
3. If no match: SELECT conversation_id FROM messages WHERE email_message_id = ANY(ref_ids)
4. Use first match, or create new conversation
```

#### 2. `email-webhook/index.ts` -- Same fix for the legacy webhook

Apply identical multi-ID lookup logic to the `getThreadId` function and conversation lookup (lines 34-84 and 151-157). Same pattern: extract all IDs, query conversations + messages for any match.

#### 3. `send-reply-email/index.ts` -- Build proper References chain

When sending a reply (lines 196-299), build the `References` header properly:

1. Fetch the conversation's `external_id` (already available as `message.conversation.external_id`)
2. Fetch ALL previous `email_message_id` values from messages in the conversation
3. Build `References` as: `<conversation.external_id> <previous_message_ids...> <in_reply_to_id>`
4. Also store the `email_thread_id` on the outgoing message matching the conversation's `external_id`

This ensures the customer's email client includes the conversation's `external_id` in future replies, making thread matching reliable.

#### 4. Merge the 3 existing split conversations

After deploying the fix, run a one-time data fix to merge conversations `53504a1c` and `75a89ca0` into `98e53a37`:

- Move all messages from the two newer conversations to the oldest one
- Delete the empty conversations
- This can be done via a simple SQL migration or a manual query

### Files changed

| File | Change |
|------|--------|
| `supabase/functions/sendgrid-inbound/index.ts` | Multi-ID thread lookup instead of single `external_id` match |
| `supabase/functions/email-webhook/index.ts` | Same multi-ID thread lookup |
| `supabase/functions/send-reply-email/index.ts` | Build full References chain, store `email_thread_id` on outgoing messages |

### Risk & Testing

- The multi-ID lookup is backward-compatible: existing threads with correct `external_id` still match on the first query
- New threads (no References) still create new conversations as before
- HelpScout pattern detection remains unchanged (checked first)
- Edge case: if References contains IDs from two genuinely different conversations, we pick the oldest -- this matches email threading convention

