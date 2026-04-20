

## Plan: Make Triage-helse panel show real numbers

### Root causes (verified against DB)

1. `notifications` RLS only allows `user_id = auth.uid()`. Critical alert rows are inserted with a system sentinel `user_id`, so the dashboard's count query returns 0 even though 134 rows exist for the org in the last 30 days.
2. `critical_alert_feedback` is correctly org-scoped, so its 4 rows ARE readable — but the percentages and worst/best sections look empty because (a) when `total_feedback = 0` on first render the panel shows the "Ingen reaksjoner" alert, and (b) there is no `refetchInterval`, so newly arrived reactions never refresh the panel without a hard reload.

### Fix

#### 1. New SQL migration — security-definer count function

Create `public.get_critical_alert_count(_organization_id uuid, _since timestamptz)` returning `integer`. `security definer`, `stable`, `set search_path = public`. Body:

```sql
select count(*)::int
from notifications
where type = 'critical_alert_sent'
  and data->>'organization_id' = _organization_id::text
  and created_at >= _since;
```

Grant `execute` to `authenticated`. Authorization is enforced caller-side: `useTriageHealth` only ever passes `currentOrganizationId` from `useOrganizationStore`, which is already gated to the user's verified org.

#### 2. `src/hooks/useTriageHealth.ts`

- Replace the blocked `notifications` count query with `supabase.rpc('get_critical_alert_count', { _organization_id: currentOrganizationId, _since: since })`.
- Add `refetchInterval: 30_000` and `refetchOnWindowFocus: true` to the `useQuery` options so reactions appear without reload.
- Leave the feedback aggregation and mutes query as-is (they're already correct).

#### 3. `src/components/admin/TriageHealthDashboard.tsx`

Split the misleading single empty-state into two:

- `data.total_alerts === 0` → "Ingen kritiske varsler de siste 30 dagene." (no alerts at all)
- `data.total_alerts > 0 && data.total_feedback === 0` → keep current "Ingen reaksjoner registrert ennå…" copy (alerts exist, just no reactions yet)

Today both render the same "no reactions" message regardless of whether there are zero alerts or zero reactions to those alerts, which is confusing.

#### 4. No other files change

- `slack-event-handler`, `send-slack-notification`, `triage-pattern-mining`, `backfill-critical-alert-ts` — no changes.
- `usePatternProposals` — leave as is for this PR (can add refetch later if needed).

### Files touched

- New migration: `get_critical_alert_count` security-definer function.
- `src/hooks/useTriageHealth.ts` — RPC + refetch.
- `src/components/admin/TriageHealthDashboard.tsx` — two-state empty handling.

### Verification

1. Reload `/admin/integrations` → "Varsler sendt" shows ~134 (or current real count), not 0.
2. "Nyttige / Falske alarmer / Dempet" reflect the 4 existing reactions (rates non-zero).
3. React 👍 in Slack on a fresh alert → panel updates within 30s without reload.
4. The "Ingen reaksjoner registrert ennå" banner only shows when alerts > 0 but feedback = 0; if both are 0 it shows "Ingen kritiske varsler de siste 30 dagene.".
5. Worst/best trigger sections render once thresholds are met.
