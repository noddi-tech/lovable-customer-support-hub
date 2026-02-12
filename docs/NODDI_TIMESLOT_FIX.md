# Noddi Time Slot & Delivery Window ID Fix

## Problem

When a customer selected a time slot in the chat widget, the booking would fail with a `400` error from the Noddi API because `delivery_window_id` was missing from the payload.

## Root Cause

The Noddi API's `/v1/delivery-windows/for-new-booking/` response returns window objects that **do not use a field called `id`**. The field is called `pk`, `delivery_window_id`, or nested under `delivery_window.id`.

In `TimeSlotBlock.tsx`, the original code did:

```typescript
delivery_window_id: window.id  // window.id is undefined!
```

Since `JSON.stringify` silently drops `undefined` values, the payload sent downstream contained no `delivery_window_id` at all. Every recovery mechanism failed because the ID was never captured in the first place.

## Fix (3 layers)

### Layer 1: Source capture (`TimeSlotBlock.tsx`) — **the actual fix**

Updated `handleSlotSelect` to try multiple possible field names:

```typescript
const windowId = window.id || window.pk || window.delivery_window_id || window.delivery_window?.id;
```

This ensures the ID is captured regardless of which field name the Noddi API uses.

A diagnostic `console.log` was added to log the first window object's keys so the exact field name can be confirmed in browser devtools.

### Layer 2: Frontend guard (`BookingSummaryBlock.tsx`)

- Truthiness check on `delivery_window_id` (rejects `0` and `undefined`)
- localStorage recovery scan: iterates `noddi_action_*` keys to find the ID from a previously selected time slot
- Final guard: if ID is still missing after recovery, shows a user-friendly error instead of sending a doomed API request

### Layer 3: Server-side fallback (`widget-ai-chat/index.ts`)

- `patchBookingSummary` scans conversation history for time slot selections
- Explicitly treats `0` as missing (`!id || id === 0`)
- Patches the summary data before forwarding to the proxy

## Key Files

| File | Role |
|------|------|
| `src/widget/components/blocks/TimeSlotBlock.tsx` | Captures window ID at selection time |
| `src/widget/components/blocks/BookingSummaryBlock.tsx` | Validates ID before booking, attempts localStorage recovery |
| `supabase/functions/widget-ai-chat/index.ts` | Server-side ID recovery from conversation history |
| `supabase/functions/noddi-booking-proxy/index.ts` | Forwards validated payload to Noddi API |

## Noddi API Payload Reference

The final booking payload to `POST /v1/bookings/` requires:

```json
{
  "address_id": 123,
  "user_id": 456,
  "user_group_id": 789,
  "delivery_window": {
    "id": 42,
    "starts_at": "2026-02-16T08:00:00Z",
    "ends_at": "2026-02-16T11:00:00Z"
  },
  "cars": [{ "license_plate": { "number": "AB12345", "country_code": "NO" }, "selected_sales_item_ids": [1] }]
}
```

## If It Breaks Again

1. Check browser console for `[TimeSlotBlock] Sample window object keys:` — verify the API response structure hasn't changed
2. Confirm `delivery_window_id` appears in the payload logged by `BookingSummaryBlock`
3. Check edge function logs for `widget-ai-chat` to see if server-side patching is activating
