

## Fix: Email Loop Detection in SendGrid Inbound

### Root Cause
The broken Norwegian characters you see are NOT from incoming customer emails — they're your own **agent replies bouncing back** through the Google Group forwarding.

Here's what happens:
1. Agent replies in the UI → message saved correctly (message `9b113c5f` with proper "Så kan jeg se på å få fikset")
2. `send-reply-email` sends the email via SendGrid to the customer
3. The Google Group or email forwarding sends a copy **back** to your inbound parse endpoint
4. `sendgrid-inbound` processes it as a new customer message, creating a **duplicate** (message `f8315acf`) with corrupted encoding
5. This duplicate overwrites the conversation status back to "open" and shows the broken `S�` `p�` characters

### Fix

**File: `supabase/functions/sendgrid-inbound/index.ts`**

Add loop detection before inserting the message:

1. **Check Message-ID against sent messages**: Before inserting, query the `messages` table for any existing message with the same `email_message_id`. If it already exists (because `send-reply-email` stored it), skip the inbound message entirely.

2. **Check for own Message-ID pattern**: Detect messages sent from your own system by checking if the `Message-ID` header contains your sending domain (e.g., `@dekkfix.no`) AND already exists in the database — these are bounce-backs.

3. **Return 200 OK** when skipping (so SendGrid doesn't retry).

This single change fixes both problems:
- No more duplicate messages with broken encoding
- Conversations won't get incorrectly reopened by bounce-backs

### What Changes

| File | Change |
|------|--------|
| `sendgrid-inbound/index.ts` | Add loop detection: skip messages whose `email_message_id` already exists in the `messages` table |

### Cleanup
After deploying, the existing duplicate messages (like `f8315acf`) with broken encoding should be deleted from the database, since the clean agent versions already exist.

