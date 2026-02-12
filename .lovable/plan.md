

# Fix: Missing `user_id`, `user_group_id`, and `delivery_window_id` in booking payload

## Root Cause

The proxy code is correct -- it maps `user_id` to `user`, `user_group_id` to `user_group`, etc. The problem is upstream: **the AI is not including these fields in the BOOKING_SUMMARY JSON** it generates.

The edge function logs prove this. The latest payload sent to Noddi:
```json
{"address_id":2860,"delivery_window":{"starts_at":"...","ends_at":"..."},"cars":[...]}
```
Notice: `user`, `user_group`, and `delivery_window.delivery_window` are all absent because `user_id`, `user_group_id`, and `delivery_window_id` were never sent by the frontend.

## Two-Part Fix

### 1. Edge function: Add validation before calling Noddi API
**File**: `supabase/functions/noddi-booking-proxy/index.ts`

Add early validation in the `create_booking` case that returns a clear 400 error if required fields are missing, instead of forwarding an incomplete payload to Noddi and getting a cryptic 502.

```
if (!user_id || !user_group_id || !delivery_window_id) {
  return jsonResponse({
    error: "Missing required fields",
    missing: {
      user_id: !user_id,
      user_group_id: !user_group_id,
      delivery_window_id: !delivery_window_id,
    }
  }, 400);
}
```

### 2. AI Prompt: Strengthen instructions for BOOKING_SUMMARY
**File**: `supabase/functions/widget-ai-chat/index.ts`

Update the `booking_summary` block instruction to be more explicit that `user_id` and `user_group_id` come from the `lookup_customer` result (`customer.userId` and `customer.userGroupId`), and `delivery_window_id` comes from the selected time slot's `id` field. Add a "NEVER omit these fields" warning.

Also update the hardcoded flow instructions (around line 1025-1032) to reinforce this.

### Deployment
- Redeploy `noddi-booking-proxy` and `widget-ai-chat`

