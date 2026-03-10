

## Plan: Norwegian Keyword Support + Multi-Workspace Slack

### Two Issues Identified

**Issue 1: Critical triage only scans English keywords**
The `CRITICAL_KEYWORDS` array in `send-slack-notification` only contains English terms (`booking`, `payment failed`, `not working`, etc.). Since customer messages are primarily in Norwegian, keywords like `kan ikke bestille`, `fungerer ikke`, `betaling feilet` will never trigger alerts.

**Issue 2: Digest/Critical alerts can only go to channels in the same workspace**
The channel selectors for Daily Digest and Critical Alerts pull from the same `slack-list-channels` call, which uses the single connected bot token. The team wants to push these to a **different** Slack workspace (e.g., the product/dev workspace), but currently only one workspace connection exists per organization.

---

### Changes

#### 1. Add Norwegian keywords to critical triage

**`supabase/functions/send-slack-notification/index.ts`** — Expand `CRITICAL_KEYWORDS` to include Norwegian equivalents:

```
'kan ikke bestille', 'bestilling feilet', 'betaling feilet', 'fungerer ikke',
'virker ikke', 'feil', 'nedetid', 'ødelagt', 'får ikke til', 'klarer ikke',
'kritisk', 'haster', 'ikke tilgjengelig', 'feiler', 'feilmelding'
```

This is a simple array expansion — the `.toLowerCase().includes()` check works identically for Norwegian strings.

#### 2. Support a second Slack workspace for digest/critical

Add an optional **secondary Slack bot token** field to the integration, allowing digest and critical alerts to be routed to a different workspace.

**New migration** — Add columns to `slack_integrations`:
- `secondary_access_token` (text, nullable) — bot token for the second workspace
- `secondary_team_name` (text, nullable)
- `secondary_team_id` (text, nullable)

**`src/components/admin/SlackIntegrationSettings.tsx`** — Add a new card section "Product Team Workspace" below the existing connection card:
- A text input for a second bot token (same flow as the setup wizard step 3)
- A "Connect" button that validates via `auth.test`
- Once connected, show the workspace name + Disconnect button
- The digest and critical channel selectors will then fetch channels from the secondary workspace when a secondary token is present

**`src/hooks/useSlackIntegration.ts`** — Add a `saveSecondaryToken` mutation (similar to `saveDirectToken`) and expose `secondaryChannels` query that calls `slack-list-channels` with the secondary token.

**`supabase/functions/slack-integration/index.ts`** — Add `action=save-secondary-token` handler: validate the token, save to `secondary_access_token`, `secondary_team_name`, `secondary_team_id`.

**`supabase/functions/slack-list-channels/index.ts`** — Accept an optional `use_secondary: true` param. When set, use `secondary_access_token` instead of `access_token`.

**`supabase/functions/send-slack-notification/index.ts`** — When posting critical alerts, use `secondary_access_token` if present (falling back to primary).

**`supabase/functions/slack-daily-digest/index.ts`** — Same: use `secondary_access_token` for digest posts if present.

**UI flow**: The digest/critical channel dropdowns will show channels from the secondary workspace when connected. If no secondary workspace is connected, they fall back to channels from the primary workspace (current behavior).

### Files changed

| File | Change |
|---|---|
| New SQL migration | Add `secondary_access_token`, `secondary_team_name`, `secondary_team_id` columns |
| `supabase/functions/send-slack-notification/index.ts` | Add Norwegian keywords + use secondary token for critical |
| `supabase/functions/slack-daily-digest/index.ts` | Use secondary token for digest posts |
| `supabase/functions/slack-integration/index.ts` | Add `save-secondary-token` action |
| `supabase/functions/slack-list-channels/index.ts` | Support `use_secondary` param |
| `src/hooks/useSlackIntegration.ts` | Add secondary token mutation + secondary channels query |
| `src/components/admin/SlackIntegrationSettings.tsx` | Add secondary workspace connection UI + wire digest/critical to secondary channels |

