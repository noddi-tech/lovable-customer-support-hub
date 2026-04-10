

# Remove Duplicate Title from Slack Notification

## Problem
The notification shows "New Email Conversation in Tronderdekk" twice: once as the top-level fallback text (visible above the colored attachment) and again as the first line inside the attachment body.

## Fix
**File: `supabase/functions/send-slack-notification/index.ts`**

Remove the header section block (lines 323-329) that duplicates the fallback text. The fallback text (line 317) already serves as the visible header above the attachment. The attachment body should start directly with the From/Subject fields.

This leaves the layout as:

```text
📧 New Email Conversation in Trønderdekk        ← fallback text (top-level)
┌──────────────────────────────────────────────┐
│ From:                       Subject:          │  ← attachment starts here
│ joachim@example.com         Testing notifs    │
│                                               │
│ > Preview text up to 300 chars...             │
│                                               │
│ 📧 Channel: Email     ⏰ 4/10/26, 11:17 PM   │
│                                               │
│ [👀 View Conversation]                        │
└──────────────────────────────────────────────┘
```

One block removal, redeploy the edge function.

