
## Make @Mentions Unmissable: Sound + Slack DM + Email

### Root Cause of Missing Slack Notification

The edge function logs show: **"Event type mention not enabled for organization"**. Your Slack integration config has `enabled_events: ['new_conversation', 'customer_reply', 'assignment']` -- the `mention` event was added later but your existing config was never updated. This is a data migration issue.

### Changes

#### 1. Fix: Auto-include `mention` in existing Slack configs

**File: `supabase/functions/send-slack-notification/index.ts`**

When loading `enabled_events`, treat `mention` as always-on (or add a migration). Simplest fix: in the event check, skip the enabled_events filter for `mention` type since mentions should always notify. Alternatively, run a one-time SQL update:

```sql
UPDATE slack_integrations
SET configuration = jsonb_set(
  configuration::jsonb,
  '{enabled_events}',
  (configuration->'enabled_events')::jsonb || '["mention"]'::jsonb
)
WHERE is_active = true
  AND NOT (configuration->'enabled_events')::jsonb @> '["mention"]'::jsonb;
```

This immediately fixes the "not enabled" issue for all existing orgs.

#### 2. Add notification sound for mentions (and all notifications)

**New file: `src/hooks/useNotificationSound.ts`**

Create a hook using Web Audio API (same pattern as existing `useChatMessageNotifications.ts`):
- `playMentionSound()` -- distinctive double-tone "ding-ding" (880Hz + 1100Hz, ~300ms total)
- `playNotificationSound()` -- single short tone for general notifications
- Lazy AudioContext initialization on first user interaction
- Respects a `soundEnabled` preference (localStorage)

**File: `src/hooks/useRealtimeNotifications.tsx`**

Integrate the sound hook:
- On any new notification INSERT via realtime, play a sound
- `mention` type notifications play the distinctive mention sound
- Other notifications play the standard sound
- This ensures the tagged person hears an alert immediately

#### 3. Send personal Slack DMs to each mentioned user

**File: `supabase/functions/process-mention-notifications/index.ts`**

Currently sends one channel notification for all mentions. Add per-user Slack DMs:
- For each mentioned user, look up their email from `profiles`
- Use the org's Slack bot token + Slack `users.lookupByEmail` API to find their Slack user ID
- Send a personal DM via `chat.postMessage` with:
  - Who mentioned them
  - Preview of the note content
  - "View Conversation" button link
- This is non-blocking (fire-and-forget), so if someone isn't on Slack it won't fail the whole flow
- Keep the existing channel notification as well

#### 4. Implement email notifications for mentions

**File: `supabase/functions/process-mention-notifications/index.ts`**

Replace the current TODO with actual email sending:
- Check the user's `email_on_mention` preference (already queried)
- If enabled, call the existing `send-email` edge function (or Supabase auth email)
- Simple email: subject "[Name] mentioned you", body with preview text and link
- Only sends if the user has opted in via notification preferences

### Result

When someone @mentions you, you get notified through **every channel**:

```text
@mention in note
  |
  +---> In-app notification (existing) + badge update
  +---> Toast popup in browser (existing)
  +---> Browser notification (existing, if permitted)
  +---> Sound alert (NEW - distinctive "ding-ding")
  +---> Slack channel post (existing, now fixed)
  +---> Personal Slack DM (NEW)
  +---> Email (NEW, if opted in)
```

### Files Changed

| File | Change |
|------|--------|
| SQL migration | One-time fix to add `mention` to existing `enabled_events` configs |
| `src/hooks/useNotificationSound.ts` | **New** -- Web Audio sound hook with mention + standard sounds |
| `src/hooks/useRealtimeNotifications.tsx` | Add sound playback on new notifications |
| `supabase/functions/process-mention-notifications/index.ts` | Add Slack DM per user + email sending |
