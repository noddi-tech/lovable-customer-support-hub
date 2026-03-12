

## Fix: Digest Frequency Persistence, Dynamic Scheduling, and Period Logic

### Problems

1. **Frequency reverts to "Daily"**: `useSlackIntegration.ts` line 73 omits `digest_frequency` from the parsed configuration. The DB stores `"both"` but the hook drops it, so the UI always falls back to `'daily'`.

2. **No cron job exists**: The digest was only sent when manually triggered. Need a `pg_cron` job.

3. **Time window unclear**: If configured for 08:00, the digest should cover the *previous day*. If configured for 17:00, it should cover *today so far*. Currently it always looks back exactly 24h from invocation time, which is fine — but the cron must run at the configured time, not at a fixed hour.

### Changes

**1. `src/hooks/useSlackIntegration.ts`** — Add missing `digest_frequency` to config parsing (line 73):
```ts
digest_frequency: (config.digest_frequency as string) || 'daily',
```

**2. `supabase/functions/slack-daily-digest/index.ts`** — Add time-gate logic:
- Accept `force: true` in the request body to bypass time checks (for manual triggers / "Send Now")
- When invoked by cron (no `force`), compare the current Oslo hour against each integration's `digest_time` hour. Skip if they don't match.
- For weekly digests: also check if it's Monday (weekly summary of the past week)
- The lookback period stays as-is: daily = 1 day back, weekly = 7 days back — this naturally means an 08:00 daily digest covers roughly "yesterday"

**3. SQL — Create hourly `pg_cron` job**:
- Run every hour on the hour, Mon-Fri
- Invokes `slack-daily-digest` with `{"digest_type": "daily"}`
- A second job runs Monday mornings for `{"digest_type": "weekly"}`
- The edge function's time-gate ensures it only actually sends when the current hour matches the org's configured `digest_time`

### File changes

| File | Change |
|---|---|
| `src/hooks/useSlackIntegration.ts` | Add `digest_frequency` to config parsing |
| `supabase/functions/slack-daily-digest/index.ts` | Add Oslo time-gate logic, `force` param, weekday check for weekly |
| SQL (via `supabase--read_query`) | Create two `pg_cron` jobs: hourly daily check + Monday weekly check |

