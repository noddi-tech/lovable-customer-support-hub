

## Fix: Critical Alerts Not Sending After Channel Change

### Root Cause

The critical alert logic in `send-slack-notification/index.ts` has a structural flaw: **critical triage runs only after the main notification succeeds** (line 443). If the main Slack post to the default channel fails for any reason (e.g., bot not in channel, token issue), the function returns a 500 on line 435 and the critical alert code is never reached.

Additionally, on line 446:
```
criticalChannelId !== channelId
```
If the new critical channel happens to be the same as the default channel, critical alerts are silently skipped.

### Plan

**Single file change**: `supabase/functions/send-slack-notification/index.ts`

1. **Decouple critical alerts from main notification success**
   - Move the critical triage block (lines 443-630) so it runs regardless of whether the main notification succeeded or failed.
   - The main notification result should still be returned, but critical triage should execute independently in a try/catch so it never blocks or is blocked by the main flow.

2. **Remove the `criticalChannelId !== channelId` guard**
   - This condition silently skips critical alerts when both channels are the same. Critical alerts should still be sent even to the same channel — they have different formatting (red attachment, CRITICAL prefix) and serve a different purpose.

3. **Add logging for critical triage skip reasons**
   - Log when critical alerts are skipped and why (disabled, no channel, deduped, no keyword/AI match) so future debugging is easier.

4. **Deploy the updated function**.

### Technical Detail

```text
Before (broken):
  send main notification → fails? → return 500 (critical never runs)
  send main notification → succeeds → check critical → channel same? → skip

After (fixed):
  send main notification → record result
  run critical triage independently (always)
  return main result
```

### Files
| # | File | Change |
|---|------|--------|
| 1 | `supabase/functions/send-slack-notification/index.ts` | Decouple critical from main; remove same-channel guard; add skip logging; deploy |

