

## Make "Resend Email" Button Visible for Failed/Unsent Messages

### Problem

The "Resend Email" option exists but is buried in a hover-only dropdown menu (`...` button). There's no visual indicator that a message was never emailed, so agents don't know they need to resend.

### Changes

#### 1. Pass `email_status` through to `NormalizedMessage`

**File: `src/lib/normalizeMessage.ts`**

Add `emailStatus?: string` field to the `NormalizedMessage` interface, and populate it from `originalMessage.email_status` during normalization.

#### 2. Show inline "Resend Email" button on failed/unsent agent messages

**File: `src/components/conversations/ChatMessagesList.tsx`**

Below the timestamp/delivery status area (lines 250-258), add a visible inline button when the message is an agent message with `email_status` of `'failed'`, `'pending'`, or `'retry'`:

- Show a small warning icon and "Email not sent" text in orange/red
- Show a visible "Resend Email" button (not hidden in dropdown) 
- Keep the dropdown option too for convenience

The inline indicator replaces the `CheckCheck` icon for failed messages, showing an alert icon instead.

#### 3. Show inline indicator in MessageCard (email view)

**File: `src/components/conversations/MessageCard.tsx`**

Add a small banner/badge below agent messages when `emailStatus` is `'failed'`/`'pending'`/`'retry'`:

- Shows "Email not delivered" with a "Resend" button
- Styled as a warning badge so it's immediately noticeable

### Visual result

For agent messages that weren't emailed, instead of just the `checkcheck` icon, agents will see:

```text
[message bubble]
2h ago  ⚠ Email not sent  [Resend Email]
```

### Files changed

| File | Change |
|------|--------|
| `src/lib/normalizeMessage.ts` | Add `emailStatus` field to `NormalizedMessage` |
| `src/components/conversations/ChatMessagesList.tsx` | Show inline warning + resend button for failed emails |
| `src/components/conversations/MessageCard.tsx` | Show inline warning badge + resend for failed emails |

