

## Fix Contact Form Conversations and Add Resend Email Button

### Problem

1. The 4 contact form conversations still show "Chat LIVE" badges (the code fix is deployed but the metadata on older conversations still triggers it in the `ConversationListItem` path)
2. Two agent replies (to Mehran Rezai and Robert Bue) were sent before the email fix -- they have `email_status: 'pending'` and were never emailed
3. Agents need a way to resend emails for messages that failed or were never sent

### Changes

#### 1. Database migration to fix existing data

Create a migration that:
- Updates the 4 widget contact form conversations to set `metadata.chatSessionStatus` to `null` (removing any live status)
- Resets `email_status` on the 2 agent replies from `'pending'` to `'retry'` so the resend button is clearly visible

Message IDs to fix:
- `bbee134d-6293-4064-9df0-f73488a76f64` (reply to Mehran Rezai)
- `1c25ddb4-95b9-423c-abd0-f44597ecc6f8` (reply to Robert Bue)

#### 2. Add "Resend Email" button to MessageCard dropdown

**File: `src/components/conversations/MessageCard.tsx`**

- Add `Mail` and `RefreshCw` icons to the lucide imports
- Add a `handleResendEmail` function that calls `supabase.functions.invoke('send-reply-email', { body: { messageId } })` and shows a toast on success/failure
- Add a "Resend Email" `DropdownMenuItem` in the message action menu (between Edit and Delete), shown only for agent messages (`authorType === 'agent'`) that are not internal notes
- The menu item shows a mail icon and "Resend Email" text

#### 3. Add "Resend Email" option to ChatMessagesList dropdown

**File: `src/components/conversations/ChatMessagesList.tsx`**

- Add the same resend capability to agent messages in the chat view
- Add `Mail` icon import and `supabase` import
- Add "Resend Email" menu item for outbound (agent) messages in the existing dropdown menu

### Technical details

```text
handleResendEmail flow:
1. Call supabase.functions.invoke('send-reply-email', { messageId })
2. On success: toast.success('Email sent successfully')
3. On error: toast.error('Failed to send email')
```

The `send-reply-email` edge function already handles all the logic (template, threading, SendGrid) -- we just need to re-invoke it with the message ID.

### Summary

| Change | File |
|--------|------|
| Fix metadata + email_status on existing conversations | New migration |
| Add "Resend Email" to message dropdown (email view) | `MessageCard.tsx` |
| Add "Resend Email" to message dropdown (chat view) | `ChatMessagesList.tsx` |

