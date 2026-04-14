

# Fix: Mention notification emails threading together

## Problem
When multiple mentions happen in the same conversation, the notification emails share the same subject line (e.g., "Joachim Rathke mentioned you in a note") and sender (`noreply@noddi.no`). Email clients like Gmail thread them together, making individual mentions easy to miss.

## Solution
Two changes to break email threading:

### 1. Add custom headers support to `send-email/index.ts`
Add an optional `headers` field to the SendGrid payload so callers can pass custom SMTP headers. This is a generic improvement.

### 2. Send unique headers from `process-mention-notifications/index.ts`
In `sendMentionEmail`:
- Include conversation subject and customer name in the email subject line for better context (e.g., "Joachim Rathke mentioned you — Re: Dekk bestilling (Øystein Borhaug)")
- Pass a unique `X-Entity-Ref-ID` header (a random UUID) — this is the standard way to prevent Gmail from threading emails with the same subject
- Pass a unique `Message-ID` header to ensure each email is treated as a standalone message

### Files to modify
- `supabase/functions/send-email/index.ts` — accept optional `headers` object, merge into SendGrid payload
- `supabase/functions/process-mention-notifications/index.ts` — pass `subject`/`customerName` to `sendMentionEmail`, build contextual subject line, add anti-threading headers

