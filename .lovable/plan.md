

## Plan: Skip Critical Alert for Mention Events

### Problem
When someone is @mentioned in a conversation, the `send-slack-notification` edge function runs critical keyword/AI triage on the mention notification too. This causes a duplicate critical alert in the #tech channel for conversations that were already flagged as critical (from `new_conversation` or `customer_reply` events). The screenshot shows a "CRITICAL ALERT — You Were Mentioned" which shouldn't happen.

### Fix
One-line change in `supabase/functions/send-slack-notification/index.ts`: skip the critical triage block when `event_type === 'mention'`.

### Change

**`supabase/functions/send-slack-notification/index.ts`** (~line 447)

Current:
```typescript
if (config.critical_alerts_enabled && criticalChannelId && criticalChannelId !== channelId) {
```

Updated:
```typescript
if (config.critical_alerts_enabled && criticalChannelId && criticalChannelId !== channelId && event_type !== 'mention') {
```

This ensures critical triage only runs for actual customer-facing events (`new_conversation`, `customer_reply`, etc.), not internal agent actions like mentions.

### Files changed

| File | Change |
|---|---|
| `supabase/functions/send-slack-notification/index.ts` | Exclude `mention` from critical triage |

