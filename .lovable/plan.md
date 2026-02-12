

# Fix: `delivery_window_id: 0` flows through entire pipeline

## Problem

The logs show `delivery_window_id: 0` reaching the proxy. Here's why -- three layers all fail to catch it:

1. **AI outputs `delivery_window_id: 0`** in its `[BOOKING_SUMMARY]` JSON (it doesn't know the real ID)
2. **Server-side `patchBookingSummary`** tries to recover it from conversation messages but either doesn't find the time slot message or the scan fails silently
3. **Frontend `BookingSummaryBlock`** passes `0` through because the recent `!= null` check was intended to preserve valid values, but `0` is never a valid delivery window ID
4. **Frontend localStorage recovery** runs (since `!0` is truthy) but apparently doesn't find the TimeSlotBlock entry -- likely because the `noddi_action_` key format or JSON structure doesn't match expectations

## Solution

### Change 1: Revert `!= null` check (BookingSummaryBlock.tsx, line 30)

Change back to truthiness check so `0` is ignored and triggers recovery:

```
// Before (broken):
if (data.delivery_window_id != null) bookingPayload.delivery_window_id = data.delivery_window_id;

// After (fixed):
if (data.delivery_window_id) bookingPayload.delivery_window_id = data.delivery_window_id;
```

### Change 2: Add guard after localStorage recovery (BookingSummaryBlock.tsx)

After the localStorage scan, if `delivery_window_id` is still missing, show a user-friendly error and abort instead of sending a doomed request:

```typescript
if (!bookingPayload.delivery_window_id) {
  setError('Could not determine your selected time slot. Please go back and select a time slot again.');
  setConfirming(false);
  onLogEvent?.('booking_delivery_window_missing', '', 'error');
  return;
}
```

### Change 3: Add logging to localStorage recovery (BookingSummaryBlock.tsx)

Log what keys are found during the scan so we can diagnose why recovery fails:

```typescript
if (!bookingPayload.delivery_window_id) {
  onLogEvent?.('booking_delivery_window_recovery', '', 'info');
  const actionKeys: string[] = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key?.startsWith('noddi_action_')) actionKeys.push(key!);
    // ... existing scan logic
  }
  onLogEvent?.('booking_recovery_keys_found', actionKeys.join(','), 'info');
}
```

### Change 4: Fix server-side scan in `patchBookingSummary` (widget-ai-chat/index.ts, line 308)

The scan at line 308 checks `!summaryData.delivery_window_id` which is `!0 === true`, so it runs. But we should also check for `0` explicitly and overwrite it:

```typescript
if (!summaryData.delivery_window_id || summaryData.delivery_window_id === 0) {
```

This ensures `0` is treated as "missing" on the server side too.

## Summary

- Revert `!= null` to truthiness check (line 30) -- `0` is never a valid ID
- Add final guard with user-friendly error when recovery fails
- Add diagnostic logging to recovery scan
- Fix server-side `patchBookingSummary` to treat `0` as missing
- Redeploy `widget-ai-chat` edge function after server-side fix
