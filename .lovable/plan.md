

# Add Multi-Recipient (BCC) Mode to New Conversation Dialog

## Overview

Add a toggle to the existing New Conversation dialog that switches from single-recipient to multi-recipient mode. In multi-recipient mode, the agent can add multiple email addresses and send the same message as individual, separate conversations — functionally identical to BCC (each recipient only sees their own email).

## How It Works

1. **Toggle in the Customer Information card**: A switch/button labeled "Send to multiple" that toggles between single and multi-recipient mode
2. **Multi-recipient input**: When toggled on, replace the single email/name fields with a multi-email input (textarea or tag-style input) where the agent can paste or type multiple emails, one per line or comma-separated
3. **On submit**: Loop through each recipient and create a separate conversation + message for each, reusing the existing `createConversationMutation` logic. Each email is sent individually via `send-reply-email`.
4. **Progress feedback**: Show a progress indicator during bulk send (e.g., "Sending 3/10...")

## Changes

### 1. `src/components/dashboard/NewConversationDialog.tsx`

**New state:**
- `isBulkMode: boolean` — toggles multi-recipient mode
- `bulkEmails: string` — raw textarea content (emails separated by newlines/commas)
- `bulkSendProgress: { current: number; total: number } | null` — tracks progress

**UI changes:**
- Add a "Send to multiple" toggle button/switch in the Customer Information card header
- When `isBulkMode` is true:
  - Hide the single email/name inputs and Noddi search
  - Show a `Textarea` for pasting multiple emails (one per line or comma-separated)
  - Show a count badge: "X valid emails detected"
  - The subject, message, inbox, and priority fields remain the same
- Submit button text changes to "Send to X recipients"

**Submit logic changes:**
- Parse `bulkEmails` into an array of unique, valid email addresses
- For each email, sequentially:
  1. Find or create customer (by email)
  2. Create conversation
  3. Create message with `sender_type='agent'`
  4. Invoke `send-reply-email`
  5. Update progress state
- On completion, show summary toast ("Sent 10 emails, 0 failed")
- Navigate to inbox (not to a specific conversation since there are multiple)

**Template variable support:**
- The message template supports `{email}` placeholder (replaced per recipient)
- Could later add `{name}` if customer names are resolved

### 2. Helper: email parsing

Add a small utility function (inline or extracted) to parse the textarea:
```
function parseEmails(raw: string): string[] {
  return raw.split(/[\n,;]+/)
    .map(e => e.trim().toLowerCase())
    .filter(e => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e))
    .filter((e, i, a) => a.indexOf(e) === i); // deduplicate
}
```

## Files to change

- `src/components/dashboard/NewConversationDialog.tsx` — add bulk mode toggle, multi-email input, sequential send loop with progress

## Edge cases

- Duplicate emails are deduplicated before sending
- Invalid email formats are silently filtered out (count shows only valid ones)
- If any individual send fails, it continues with the rest and reports failures at the end
- The existing Bulk Outreach page remains for plate-based lookups; this feature is for when you already have email addresses

