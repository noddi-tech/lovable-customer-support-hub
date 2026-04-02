

## Fix: Emails Stuck as "Not Delivered" + Internal Notes False Warnings

### Problem

Two related bugs cause "Email not delivered" warnings:

1. **Reply emails fail silently and stay "pending" forever**: When `send-reply-email` fails (SendGrid timeout, network error), neither the client nor the edge function updates `email_status` to `'failed'`. The message stays `pending` permanently. Users must manually press Resend.

2. **Internal notes show "Email not delivered"**: Internal notes (e.g. @mentions) are inserted without explicit `email_status`, inheriting the DB default `'pending'`. The send function correctly skips them but never clears the status.

3. **ChatReplyInput swallows errors**: The widget reply component uses try/catch on `supabase.functions.invoke`, which returns `{ error }` instead of throwing — so errors are never caught.

### Changes

| # | File | Change |
|---|------|--------|
| 1 | `src/contexts/ConversationViewContext.tsx` | Set `email_status: isInternal ? null : 'pending'` on message insert. On edge function error, update the message's `email_status` to `'failed'` in the DB. |
| 2 | `src/components/conversations/ChatReplyInput.tsx` | Fix error handling: destructure `{ error }` from invoke instead of try/catch. On error, update `email_status` to `'failed'` and show toast. |
| 3 | `supabase/functions/send-reply-email/index.ts` | In the catch block, update `email_status` to `'failed'` before returning 500. When skipping internal notes, set `email_status` to `null`. |
| 4 | Data cleanup (SQL via insert tool) | `UPDATE messages SET email_status = NULL WHERE is_internal = true AND email_status = 'pending'` and `UPDATE messages SET email_status = 'failed' WHERE sender_type = 'agent' AND is_internal = false AND email_status = 'pending' AND created_at < NOW() - INTERVAL '5 minutes'` |

### Technical detail

**ConversationViewContext — insert fix:**
```typescript
// Set email_status explicitly on insert
email_status: isInternal ? null : 'pending',
```

**ConversationViewContext — error handler fix:**
```typescript
if (emailError) {
  await supabase.from('messages').update({ email_status: 'failed' }).eq('id', message.id);
  toast.warning('Reply saved but email sending failed');
}
```

**ChatReplyInput — error handling fix:**
```typescript
// Before (broken — invoke doesn't throw):
try {
  await supabase.functions.invoke('send-reply-email', { body: { messageId } });
} catch (emailErr) { /* never fires */ }

// After:
const { error: emailError } = await supabase.functions.invoke('send-reply-email', {
  body: { messageId: insertedMsg.id }
});
if (emailError) {
  await supabase.from('messages').update({ email_status: 'failed' }).eq('id', insertedMsg.id);
  toast.warning('Reply saved but email sending failed');
}
```

**Edge function — catch block fix:**
```typescript
} catch (error: any) {
  if (messageId) {
    await supabaseClient.from('messages').update({ email_status: 'failed' }).eq('id', messageId);
  }
  return new Response(JSON.stringify({ error: error.message }), { status: 500 });
}
```

