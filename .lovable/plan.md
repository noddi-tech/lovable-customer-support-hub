

# Per-Inbox Full Routing: Notifications + Digests + Critical Alerts

## Two problems to fix

**1. Can't select Navio workspace**: The workspace toggle is disabled until a channel is already selected (`disabled={!isRouted}`). Since the channel dropdown defaults to Primary channels, there's no way to switch to Navio first. Chicken-and-egg bug.

**2. Digest and Critical are org-level only**: Currently there's one digest channel and one critical channel for the entire organization. User wants full per-inbox control: each inbox should independently configure its notification channel, digest channel, and critical channel — each with its own workspace selection.

## New UX model

Each inbox becomes a self-contained routing card with three channel slots:

```text
┌─────────────────────────────────────────────────┐
│ Trønderdekk                                     │
│                                                  │
│ Notifications   [Navio ▼]  [#tronderdekk-support ▼] │
│ Digest          [Navio ▼]  [#tronderdekk-digest  ▼] │
│ Critical Alerts [Navio ▼]  [#tronderdekk-urgent  ▼] │
│                                                  │
│                                    [Remove all]  │
├─────────────────────────────────────────────────┤
│ Dekkfix                                          │
│                                                  │
│ Notifications   [Primary ▼]  [#support ▼]       │
│ Digest          [Primary ▼]  [#digest  ▼]       │
│ Critical Alerts [Primary ▼]  [#critical ▼]      │
└─────────────────────────────────────────────────┘
```

Workspace selector comes **before** the channel dropdown (fixes the Navio bug). Org-level digest/critical sections become fallback defaults for inboxes without specific routing.

## Database changes

**Migration**: Add columns to `inbox_slack_routing`:
- `digest_channel_id text`
- `digest_channel_name text`
- `digest_use_secondary boolean default false`
- `critical_channel_id text`
- `critical_channel_name text`
- `critical_use_secondary boolean default false`

The existing `channel_id` / `use_secondary_workspace` remain for notification routing.

## Edge function changes

**`send-slack-notification`**: Already looks up `inbox_slack_routing` for notifications. Add: if the event is critical, check `critical_channel_id` / `critical_use_secondary` from the same routing row first.

**`slack-daily-digest`**: When generating per-inbox digests, use `digest_channel_id` / `digest_use_secondary` from the routing row instead of the org-level digest channel.

**`review-open-critical`**: Use `critical_channel_id` / `critical_use_secondary` from routing row per conversation's inbox.

## UI changes

**`InboxSlackRouting.tsx`**: Redesign each inbox row to show three channel slots (notifications, digest, critical). Each slot has a workspace dropdown (Primary/Navio) and a channel dropdown. Workspace selection works independently of channel selection (no more `disabled={!isRouted}`).

**`SlackIntegrationSettings.tsx`**: Keep org-level digest/critical sections as "Default" fallbacks, but label them clearly as defaults for unrouted inboxes.

## Files to change

1. **New migration** -- add 6 columns to `inbox_slack_routing`
2. **`src/components/admin/InboxSlackRouting.tsx`** -- redesign to 3-slot per-inbox routing
3. **`src/components/admin/SlackIntegrationSettings.tsx`** -- label digest/critical as defaults
4. **`supabase/functions/send-slack-notification/index.ts`** -- use critical routing from inbox row
5. **`supabase/functions/slack-daily-digest/index.ts`** -- use digest routing from inbox row
6. **`supabase/functions/review-open-critical/index.ts`** -- use critical routing from inbox row

