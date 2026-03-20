

## Fix: Contact Form Emails Create Wrong Customer & Replies Go to Inbox

### Problem

When a contact form sends email via Resend as `From: hei@dekkfix.no` with `Reply-To: amanueltekber@gmail.com`:

1. The inbound webhook doesn't detect this as a "forwarded" message because `hei@dekkfix.no` ≠ `hei@inbound.dekkfix.no` (the group detection comparison fails)
2. Customer is created as `hei@dekkfix.no` (the inbox itself) instead of `amanueltekber@gmail.com`
3. Agent replies go to `hei@dekkfix.no` — back to the inbox — instead of to Amanuel

### Root Cause

Line 303 in `sendgrid-inbound/index.ts`:
```
const looksLikeGroup = (fromEmail === rcptEmail) || ...
```
This misses the case where `fromEmail` matches the route's **public** `group_email` (e.g., `hei@dekkfix.no`) but `rcptEmail` is the parse subdomain version (`hei@inbound.dekkfix.no`).

### Fix (two parts)

**1. `supabase/functions/sendgrid-inbound/index.ts`** — Improve group detection

Expand the `looksLikeGroup` check to also compare `fromEmail` against:
- The route's `group_email` field (available from the route query on line 239)
- A domain-based match: same local part, `fromEmail` domain is the base of `rcptEmail` domain (e.g., `dekkfix.no` vs `inbound.dekkfix.no`)

When `looksLikeGroup` is true and `Reply-To` exists, use the Reply-To address as the customer — this already works (lines 305-308), it just never triggers.

**2. `supabase/functions/send-reply-email/index.ts`** — Reply-To fallback for recipient

Before sending, check if the conversation's original message has a `Reply-To` header. If the customer email matches the inbox/route address (i.e., it's clearly wrong), use the `Reply-To` from the first message as the actual recipient instead.

**3. Database fix** — Update the existing conversation

Update the customer record and conversation for Amanuel's message so the existing conversation points to the right person.

### What changes

| File | Change |
|------|--------|
| `sendgrid-inbound/index.ts` | Add `route?.group_email` and domain-match to `looksLikeGroup` check |
| `send-reply-email/index.ts` | Add Reply-To fallback: if customer email matches inbox address, use Reply-To from original message |
| Database migration | Fix the existing conversation's customer to `amanueltekber@gmail.com` |

### Technical detail

The `looksLikeGroup` line becomes:
```typescript
const routeGroupEmail = route?.group_email?.toLowerCase()?.trim();
const fromMatchesRoute = routeGroupEmail && fromEmail.toLowerCase() === routeGroupEmail;
const fromMatchesRcptBase = fromEmail.split('@')[0].toLowerCase() === rcptEmail.split('@')[0].toLowerCase();

const looksLikeGroup = (fromEmail === rcptEmail) 
  || fromMatchesRoute 
  || fromMatchesRcptBase
  || / via /i.test(fromRaw) 
  || (senderHeaderEmail && senderHeaderEmail === rcptEmail);
```

This ensures contact form emails (sent as the business address with Reply-To) get the correct customer attribution.

