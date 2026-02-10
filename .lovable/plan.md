

# Fix: Customer Lookup Returning "No Customer Found"

## Problem

The `executeLookupCustomer` function in `widget-ai-chat` silently swallows errors from the Noddi API. When the API returns a non-OK response (400, 404, 500, etc.), the code just skips over it and reports "No customer found" -- giving no indication of what actually went wrong.

Your phone number `+47 41 35 45 69` exists in the system, but the lookup is failing silently.

## Root Cause

Line 199 of `widget-ai-chat/index.ts`:
```typescript
if (resp.ok) userData = await resp.json();
// If resp is NOT ok, we silently ignore it -- no logging, no error message
```

Additionally, the phone normalization regex may have edge cases. For the input `41354569`, the regex produces `+4741354569` which looks correct, but without error logging we cannot confirm whether the Noddi API is rejecting the request or returning an unexpected format.

## Changes

### File: `supabase/functions/widget-ai-chat/index.ts`

**1. Add error logging to `executeLookupCustomer`:**

When the Noddi API returns a non-OK response, log the status code and response body. This will make future debugging much easier.

```typescript
if (phone) {
  const cleanPhone = phone.replace(/\s+/g, '').replace(/^(\+?47)?/, '+47');
  console.log(`[lookup] Looking up phone: ${cleanPhone}`);
  const resp = await fetch(`${API_BASE}/v1/users/get-by-phone-number/?phone_number=${encodeURIComponent(cleanPhone)}`, { headers });
  if (resp.ok) {
    userData = await resp.json();
  } else {
    const errText = await resp.text().catch(() => '');
    console.error(`[lookup] Noddi API error for phone ${cleanPhone}: ${resp.status} ${errText}`);
  }
}
```

**2. Improve phone normalization to handle more formats:**

The current regex `^(\+?47)?` has a subtle issue -- for numbers that already start with `+47`, it works. For bare numbers like `41354569`, it also works. But for numbers like `004741354569` (international dialing), it would fail. Make the normalization more robust:

```typescript
let cleanPhone = phone.replace(/\s+/g, '').replace(/[^\d+]/g, '');
// Handle various Norwegian phone formats
if (cleanPhone.startsWith('0047')) cleanPhone = '+47' + cleanPhone.slice(4);
else if (cleanPhone.startsWith('+47')) { /* already correct */ }
else if (cleanPhone.startsWith('47') && cleanPhone.length === 10) cleanPhone = '+' + cleanPhone;
else if (/^\d{8}$/.test(cleanPhone)) cleanPhone = '+47' + cleanPhone;
```

**3. Add similar logging for email lookup and non-OK booking fetch.**

## Summary

| File | Change |
|------|--------|
| `supabase/functions/widget-ai-chat/index.ts` | Add error logging to customer lookup, improve phone normalization |

After deploying, we can check the edge function logs to see the exact Noddi API error and fix accordingly.
