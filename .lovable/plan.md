
# Fix: Missing Car/Service in BOOKING_INFO + Broken ACTION_MENU

## Root Causes

### Issue 1: Car and Service missing from BOOKING_INFO card
The Noddi API returns `cars` (plural array) on bookings, not `car` (singular). The stored_cars extraction (line 930-941) already handles `b.cars`, but the booking mapping at line 1003 only checks `b.car`. Since `b.car` is likely undefined, `vehicle` is set to `null`.

Similarly, `services` relies on `b.order_lines` which may not be populated by the `customer-lookup-support` endpoint. The services might be under a different field name (e.g., `items`, `sales_items`, `services`).

### Issue 2: `[ACTION_MENU]` renders as raw text
The AI outputs a bare `[ACTION_MENU]` marker (no options, no closing tag). The `patchActionMenu` function checks `reply.includes('[ACTION_MENU]')` at line 602 and exits early, thinking the marker is already there. But a bare `[ACTION_MENU]` without `[/ACTION_MENU]` and options is not parseable by the widget -- it renders as plain text.

### Issue 3: No action menu at all
Because `patchActionMenu` exits early (Issue 2), no proper `[ACTION_MENU]...[/ACTION_MENU]` is ever injected.

---

## Fixes

### Fix A: Vehicle mapping -- handle `cars` array (plural)

In the booking mapping (line 1003), add fallback to `b.cars[0]`:

```typescript
vehicle: (() => {
  const c = b.car || (Array.isArray(b.cars) && b.cars[0]) || null;
  if (!c) return null;
  const plate = c.license_plate_number || c.license_plate || '';
  return `${c.make || ''} ${c.model || ''} ${plate ? `(${plate})` : ''}`.trim() || null;
})(),
```

### Fix B: Services mapping -- add fallback field names

Check `b.order_lines`, `b.items`, `b.sales_items`, and `b.services`:

```typescript
services: (() => {
  const lines = b.order_lines || b.items || b.sales_items || b.services || [];
  if (Array.isArray(lines)) {
    return lines.map((ol: any) => 
      typeof ol === 'string' ? ol : (ol.service_name || ol.name || '')
    ).filter(Boolean);
  }
  return [];
})(),
```

### Fix C: Fix patchActionMenu guard to check for COMPLETE markers

Change line 602 from:
```typescript
if (!reply.includes('[BOOKING_INFO]') || reply.includes('[ACTION_MENU]')) return reply;
```
To check for a properly formed `[ACTION_MENU]...[/ACTION_MENU]` pair:
```typescript
const hasCompleteActionMenu = reply.includes('[ACTION_MENU]') && reply.includes('[/ACTION_MENU]');
if (!reply.includes('[BOOKING_INFO]') || hasCompleteActionMenu) return reply;
```

Also strip any bare/malformed `[ACTION_MENU]` text before injecting the proper one:
```typescript
cleaned = cleaned.replace(/\[ACTION_MENU\](?!\n)/g, ''); // Remove bare [ACTION_MENU] without content
```

### Fix D: Also fix patchBookingInfo vehicle extraction (lines 554-563)

Same issue -- the patchBookingInfo function also needs to handle `cars` array when building the info card from tool results:

```typescript
if (bookingData.vehicle) {
  info.car = typeof bookingData.vehicle === 'string' ? bookingData.vehicle : ...;
} else if (bookingData.car && typeof bookingData.car === 'object') {
  // existing handling
} else if (bookingData.cars?.[0]) {
  const car = bookingData.cars[0];
  const plate = car.license_plate_number || car.license_plate || '';
  info.car = `${car.make || ''} ${car.model || ''} ${plate ? `(${plate})` : ''}`.trim();
}
```

Also add `license_plate_number` fallback at line 562 (currently only checks `license_plate`).

### Fix E: Add debug logging

Log the actual booking data shape so future issues can be diagnosed without guessing:

```typescript
console.log('[patchBookingInfo] bookingData keys:', Object.keys(bookingData), 
  'has car:', !!bookingData.car, 'has cars:', !!bookingData.cars,
  'has vehicle:', !!bookingData.vehicle, 'has services:', !!bookingData.services,
  'has order_lines:', !!bookingData.order_lines);
```

---

## Technical Details

### File: `supabase/functions/widget-ai-chat/index.ts`

**All changes in one file:**

1. **Line 602**: Fix patchActionMenu guard to require BOTH `[ACTION_MENU]` AND `[/ACTION_MENU]`
2. **Lines 618-626**: Strip bare/malformed `[ACTION_MENU]` text before injecting proper one  
3. **Lines 554-563**: Fix patchBookingInfo vehicle extraction to handle `cars` array and `license_plate_number`
4. **Line 991**: Fix services mapping to check fallback field names
5. **Line 1003**: Fix vehicle mapping to use `cars[0]` fallback
6. **Add debug log** after line 515 to capture booking data shape

### Deploy

Re-deploy `widget-ai-chat` edge function.

## Expected Result

1. BOOKING_INFO card shows all 5 fields: address, date, time, car (with reg nr), and service
2. ACTION_MENU renders as clickable pills (not raw text) with options: "Endre tidspunkt", "Endre adresse", "Endre bil", "Legg til tjenester", "Avbestille bestilling"
