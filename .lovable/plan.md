

# Fix: Remove `...rest` spread that leaks display fields into API payload

## Problem

The `create_booking` case destructures known fields from the request body, then spreads `...rest` into the API payload. The AI's booking summary JSON includes display fields like `address`, `car`, `service`, `date`, `time`, `price` (used for the summary card UI). These leak into the Noddi API payload via `...rest`, and `address` specifically triggers the validation error.

## Change

**File**: `supabase/functions/noddi-booking-proxy/index.ts` (lines 213-214)

Remove `...rest` from the `cartPayload` construction:

```typescript
// Before
const cartPayload: any = {
  ...rest,
  address_id,
  ...
};

// After
const cartPayload: any = {
  address_id,
  ...
};
```

This ensures only the explicitly mapped fields are sent to the Noddi API.

## Deployment
- Redeploy `noddi-booking-proxy`
