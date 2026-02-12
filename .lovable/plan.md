

# Fix: BookingSummaryBlock not forwarding delivery_window timestamps

## Problem

The proxy and AI prompt now support `delivery_window_start` and `delivery_window_end`, but the `BookingSummaryBlock.tsx` component only forwards `delivery_window_id` (line 30). The `starts_at` and `ends_at` values from the AI's JSON are silently dropped, so the Noddi API still receives `{"id": 1}` without timestamps.

## Fix

**File**: `src/widget/components/blocks/BookingSummaryBlock.tsx` (after line 30)

Add two lines to forward the timestamps:

```typescript
if (data.delivery_window_start) bookingPayload.delivery_window_start = data.delivery_window_start;
if (data.delivery_window_end) bookingPayload.delivery_window_end = data.delivery_window_end;
```

No other files need changes -- the proxy and AI prompt are already correct.

## Deployment
- No edge function redeployment needed; this is a frontend-only fix.
