
# Fix: delivery_window must be an object, not an integer

## Problem

The Noddi API returns this error:
```
delivery_window: Expected an object, but received int
```

On line 218 of `noddi-booking-proxy/index.ts`, the proxy sends:
```typescript
delivery_window: delivery_window_id,  // sends e.g. 679 (an integer)
```

But the API expects an object: `{ "id": 679 }`.

## Fix

**File**: `supabase/functions/noddi-booking-proxy/index.ts` (line 218)

Change:
```typescript
delivery_window: delivery_window_id,
```
To:
```typescript
delivery_window: { id: delivery_window_id },
```

Also update the comment on line 211 to reflect the correct format.

## Deployment
- Redeploy `noddi-booking-proxy` edge function
