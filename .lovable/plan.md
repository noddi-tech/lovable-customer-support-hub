

# Fix Tire Quotes display issues

## Problems (from screenshot)
1. **`[object Object]`** — `tq.car.license_plate` is an object (likely `{number: "XX1234", country: "NO"}`), not a string
2. **Active status not labeled** — the top-right badge should say "Active status: X"
3. **Events section not labeled** — should say "Historic events:" before the badge list
4. **Missing label** — `BOOKING_PROPOSAL_TIRE_MOUNT_SENT_TO_CUSTOMER` should map to "Booking proposal sent" (currently "Proposal sent")
5. **Fulfilled + paid not visually complete** — should show green background with checkmark

## Changes

**File: `src/components/dashboard/voice/NoddiCustomerDetails.tsx`**

### 1. Fix `[object Object]` for license plate (line 1068)
```tsx
// Extract plate string from object or string
const plate = typeof tq.car?.license_plate === 'object' 
  ? tq.car.license_plate?.number || tq.car.license_plate?.registration_number 
  : tq.car?.license_plate;
```
Display: `Peugeot Ion (AB12345)` — or just the plate if make/model missing.

### 2. Label the active status badge (line 1071-1078)
Prefix with "Active status:" or change format to show it clearly. For fulfilled + paid quotes, use green bg with checkmark icon.

### 3. Add "Historic events:" label before event badges (line 1090-1091)
```tsx
<span className="text-[10px] text-muted-foreground">Historic events:</span>
```

### 4. Update event label mapping (line 19)
```
BOOKING_PROPOSAL_TIRE_MOUNT_SENT_TO_CUSTOMER: 'Booking proposal sent',
```

### 5. Green completed state for fulfilled + paid
When `tq.status === 'FULFILLED' && tq.payment_status === 'paid'`, show a green card border and a checkmark icon to indicate completion.

## Files to modify
- `src/components/dashboard/voice/NoddiCustomerDetails.tsx` — tire quotes section

