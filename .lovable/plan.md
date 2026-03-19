

## Notification System Audit — Findings and Fix Plan

### What's Working
- **In-app notifications**: The `process-mention-notifications` edge function correctly inserts into the `notifications` table when someone is @mentioned. The realtime listener (`useRealtimeNotifications`) picks these up and shows toast + browser notifications + plays sound.
- **Slack notifications**: Both channel posts and personal DMs work when Slack integration is active.
- **Notification preferences**: The `useNotificationPreferences` hook and settings UI exist and allow toggling `email_on_mention` and `app_on_mention`.
- **@mention invocation**: `processMentions()` is called from ReplyArea (internal notes), ChatReplyInput, TicketCommentsList, and CustomerNotes.

### What's Broken

**1. Email notifications for mentions do not work**
The `sendMentionEmail` function (line 177) calls `send-email` edge function — but **no `send-email` edge function exists**. There is no `supabase/functions/send-email/` directory. The function call silently fails (caught by try/catch, logged as "non-blocking").

This means: even though users opt into `email_on_mention`, no email is ever actually sent.

**2. No email domain configured**
The project has no email domain set up in the workspace, which means even if we create a `send-email` function, there's no verified sender domain to send from.

**3. Link URLs in notifications use old broken format**
Line 265: `linkUrl = \`\${appUrl}/?c=\${context.conversation_id}\`` — this uses the old root-redirect format that was identified as broken. Should use the canonical `/c/{id}` short link format that was just implemented.

### Fix Plan

#### Step 1: Set up email domain
Before emails can be sent, an email domain needs to be configured. This requires you to set up a sender domain through Cloud -> Emails. I'll present the setup dialog.

#### Step 2: Create the `send-email` edge function
Create a `supabase/functions/send-email/index.ts` that accepts `{ to, subject, html }` and sends the email using the project's email infrastructure (Resend/SendGrid or Lovable's built-in email queue if available). This is the missing piece that `process-mention-notifications` depends on.

#### Step 3: Fix link URLs in `process-mention-notifications`
Update line 265 to use the canonical short link format:
```
linkUrl = `${appUrl}/c/${context.conversation_id}`;
```

#### Step 4: Deploy updated edge functions
Deploy both `send-email` and `process-mention-notifications`.

### Summary

The notification system architecture is sound — the only gap is a missing `send-email` edge function (the email delivery endpoint). Everything else (preferences, in-app notifications, Slack, sounds, browser notifications) is wired up and functional. Once the email domain is configured and the `send-email` function is created, mention emails will start flowing.

