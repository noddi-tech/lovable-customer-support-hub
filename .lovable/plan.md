

# Add Per-Inbox Digest & Critical Alert Toggles

## Problem
Some inboxes (like Trønderdekk) only need real-time notifications -- digests and critical alerts are unnecessary noise. Currently there's no way to disable these per inbox.

## Approach
Add two boolean columns to `inbox_slack_routing` and a simple toggle UI per slot. When disabled, the channel selector is hidden and edge functions skip that inbox for digests/critical alerts.

## Database
**Migration** -- add two columns:
```sql
ALTER TABLE public.inbox_slack_routing
  ADD COLUMN digest_enabled boolean DEFAULT true,
  ADD COLUMN critical_enabled boolean DEFAULT true;
```

## UI Changes (`InboxSlackRouting.tsx`)
- Add a small switch/toggle next to the Digest and Critical Alerts labels
- When toggled off: hide the workspace + channel dropdowns for that slot, show "Disabled" badge
- When toggled on (default): show dropdowns as today
- Notifications slot has no toggle (always enabled if the routing row exists)

```text
┌─────────────────────────────────────────────────┐
│ Trønderdekk                        [Remove all] │
│                                                  │
│ Notifications   [Navio ▼]  [#support ▼]         │
│ Digest      [off]  Disabled                      │
│ Critical    [off]  Disabled                      │
└─────────────────────────────────────────────────┘
```

## Edge Function Changes
1. **`slack-daily-digest`** -- when querying `inbox_slack_routing` for per-inbox digests, add `AND digest_enabled = true`. Inboxes with `digest_enabled = false` are excluded entirely (not even included in the default org digest for that inbox).
2. **`review-open-critical`** -- when looking up routing, skip critical alerts for inboxes where `critical_enabled = false`.
3. **`send-slack-notification`** -- for the critical alert section, check `critical_enabled` from the routing row before sending.

## Files to change
1. **New migration** -- add `digest_enabled` and `critical_enabled` columns
2. **`src/components/admin/InboxSlackRouting.tsx`** -- add toggle switches per slot
3. **`supabase/functions/send-slack-notification/index.ts`** -- respect `critical_enabled`
4. **`supabase/functions/slack-daily-digest/index.ts`** -- respect `digest_enabled`
5. **`supabase/functions/review-open-critical/index.ts`** -- respect `critical_enabled`

