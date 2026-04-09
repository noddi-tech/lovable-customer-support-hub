

# Add Retry Logic to send-reply-email Edge Function

## Problem

Transient 502 errors from Supabase cause the message fetch to fail on first attempt, showing "Reply saved but email sending failed" even though a retry succeeds.

## Fix

### `supabase/functions/send-reply-email/index.ts`

Add a retry wrapper around the message fetch query (lines 99-113). On failure, wait 1 second and retry up to 2 times.

Replace the single query call with:

```typescript
// Retry wrapper for transient DB errors
async function fetchWithRetry<T>(fn: () => Promise<{ data: T; error: any }>, retries = 2, delayMs = 1000) {
  for (let attempt = 0; attempt <= retries; attempt++) {
    const result = await fn();
    if (!result.error) return result;
    if (attempt < retries) {
      console.warn(`DB fetch attempt ${attempt + 1} failed, retrying in ${delayMs}ms...`, result.error?.message);
      await new Promise(r => setTimeout(r, delayMs));
    }
  }
  return fn(); // final attempt, return whatever happens
}
```

Then wrap the existing message fetch at lines 99-113:

```typescript
const { data: message, error: messageError } = await fetchWithRetry(() =>
  supabaseClient
    .from('messages')
    .select(`...`)  // existing select stays the same
    .eq('id', messageId)
    .single()
);
```

### File to change

- `supabase/functions/send-reply-email/index.ts` — add `fetchWithRetry` helper, wrap message fetch

