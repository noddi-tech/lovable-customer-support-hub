

# Fix: Revert `address` back to `address_id`

The Noddi API error is clear: `'address' is an invalid field. Did you mean 'address_id'?`

The previous fix over-corrected by renaming `address_id` to `address`. It needs to stay as `address_id`.

## Change

**File**: `supabase/functions/noddi-booking-proxy/index.ts` (line 215)

Change:
```typescript
address: address_id,
```
Back to:
```typescript
address_id,
```

The other renames (`user`, `user_group`, `delivery_window.delivery_window`) were correct and stay as-is.

## Deployment
- Redeploy `noddi-booking-proxy`
