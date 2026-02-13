

# Fix: Booking Update Missing `delivery_window.starts_at` and `ends_at`

## Problem

When updating a booking's time slot, the Noddi API requires `delivery_window` to include `id`, `starts_at`, AND `ends_at`. Currently:

1. The system prompt example for `[BOOKING_EDIT]` only includes `delivery_window_id` -- no start/end times
2. The AI generates `[BOOKING_EDIT]` JSON without `delivery_window_start`/`delivery_window_end`
3. The proxy builds `{ id: X, starts_at: undefined, ends_at: undefined }` -- `JSON.stringify` drops undefined values
4. Noddi gets `{ id: X }` and returns a 400 validation error

## Fix (2 files)

### File 1: `supabase/functions/widget-ai-chat/index.ts`

Update the `[BOOKING_EDIT]` marker examples and instructions to always include `delivery_window_start` and `delivery_window_end` alongside `delivery_window_id`:

- Line ~724 (BOOKING_EDIT instruction): Change example from:
  ```
  {"booking_id": 12345, "changes": {"time": "14:00-17:00", "old_time": "08:00-11:00", "delivery_window_id": 99999}}
  ```
  to:
  ```
  {"booking_id": 12345, "changes": {"time": "14:00-17:00", "old_time": "08:00-11:00", "delivery_window_id": 99999, "delivery_window_start": "2026-02-16T13:00:00Z", "delivery_window_end": "2026-02-16T16:00:00Z"}}
  ```

- Line ~886 (system prompt example): Same update.

- Line ~894 (after TIME_SLOT instruction): Add explicit note:
  ```
  IMPORTANT: When showing [BOOKING_EDIT] for time changes, you MUST include delivery_window_id, delivery_window_start (ISO), and delivery_window_end (ISO) from the customer's [TIME_SLOT] selection.
  ```

### File 2: `supabase/functions/noddi-booking-proxy/index.ts`

Add a server-side guard (lines 318-324) so that if `delivery_window_id` is provided but `starts_at` or `ends_at` is missing, the proxy returns a clear 400 error instead of forwarding an invalid payload:

```typescript
if (ubDwId) {
  if (!ubDwStart || !ubDwEnd) {
    return jsonResponse({ error: "delivery_window_start and delivery_window_end are required when changing time" }, 400);
  }
  patchPayload.delivery_window = {
    id: ubDwId,
    starts_at: ubDwStart,
    ends_at: ubDwEnd,
  };
}
```

## Scope

| File | Change |
|------|--------|
| `supabase/functions/widget-ai-chat/index.ts` | Update BOOKING_EDIT examples to include `delivery_window_start`/`end`; add explicit instruction |
| `supabase/functions/noddi-booking-proxy/index.ts` | Add validation guard for missing start/end times |

