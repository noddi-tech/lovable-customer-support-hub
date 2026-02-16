

# Fix: Booking Select Carousel, Missing Data, and Cancel Endpoint

## Issue 1: Cards not displaying as proper carousel

The current layout uses `flex: 1 1 0` for 2 bookings, squeezing both into one row in the narrow widget. The cards should stack vertically (one per row) when there are 2 or fewer, and use horizontal scroll only for 3+.

**File: `src/widget/components/blocks/BookingSelectBlock.tsx`**

Change the flex container from horizontal row to vertical stack for 1-2 bookings:
- For 1-2 bookings: `flexDirection: 'column'`, each card takes full width
- For 3+: keep horizontal scroll with fixed card widths

Replace the outer flex container styles (line 37-43):
```typescript
display: 'flex',
flexDirection: bookings.length <= 2 ? 'column' : 'row',
gap: '10px',
overflowX: bookings.length > 2 ? 'auto' : 'visible',
paddingBottom: '8px',
scrollSnapType: bookings.length > 2 ? 'x mandatory' : undefined,
```

Update card styles (line 57-59): remove `minWidth`/`maxWidth`/`flex` for vertical layout:
```typescript
minWidth: bookings.length <= 2 ? '100%' : '220px',
maxWidth: bookings.length <= 2 ? '100%' : '260px',
flex: bookings.length <= 2 ? 'none' : '0 0 auto',
```

## Issue 2: Second booking missing date/time/address data

The `executeLookupCustomer` function extracts bookings from two sources:
1. `bookings_summary.priority_booking` -- one per group, has full delivery window data
2. `unpaid_bookings` -- different shape, may lack `start_time`, `address`, etc.

The mapping at line 1306-1398 tries to extract `start_time`, `address`, `car` etc., but `unpaid_bookings` uses different field names. We need to also check for:
- `delivery_window.starts_at` / `delivery_window.ends_at` (common in unpaid_bookings)
- `booking_items_car[].car` for vehicle data
- `order.delivery_address` or `delivery_address` for address

**File: `supabase/functions/widget-ai-chat/index.ts`**

In the booking mapping (line 1312-1313), expand the timestamp fallback chain:
```typescript
const startRaw = b.start_time || b.scheduled_at || b.delivery_window_starts_at 
  || b.delivery_window?.starts_at || b.deliveryWindowStartsAt || '';
const endRaw = b.end_time || b.delivery_window_ends_at 
  || b.delivery_window?.ends_at || b.deliveryWindowEndsAt || '';
```

For address (line 1323-1331), add fallbacks:
```typescript
const addrObj = b.address || b.delivery_address || b.order?.delivery_address;
```

Also add `upcoming_bookings` from `bookings_summary` if available -- some groups expose multiple upcoming bookings beyond just the priority one:
```typescript
// 1b. Collect upcoming_bookings from bookings_summary
for (const group of userGroups) {
  const upcoming = group.bookings_summary?.upcoming_bookings;
  if (Array.isArray(upcoming)) {
    for (const ub of upcoming) {
      if (ub?.id && !seenBookingIds.has(ub.id)) {
        bookings.push(ub);
        seenBookingIds.add(ub.id);
      }
    }
  }
}
```

Additionally, use the `bookings-for-customer` endpoint as a fallback to get ALL bookings with full data when the customer-lookup-support response has incomplete booking data:
```typescript
// 3. If bookings have incomplete data, fetch from bookings-for-customer
if (userGroupId && bookings.some(b => !b.start_time && !b.delivery_window_starts_at && !b.delivery_window?.starts_at && !b.deliveryWindowStartsAt)) {
  try {
    const bfcResp = await fetch(`${API_BASE}/v1/user-groups/${userGroupId}/bookings-for-customer/?page_size=20`, { headers });
    if (bfcResp.ok) {
      const bfcData = await bfcResp.json();
      const results = Array.isArray(bfcData) ? bfcData : (bfcData.results || []);
      for (const fb of results) {
        if (fb?.id && seenBookingIds.has(fb.id)) {
          // Replace the incomplete booking with the full one
          const idx = bookings.findIndex(b => b.id === fb.id);
          if (idx >= 0) bookings[idx] = fb;
        } else if (fb?.id && !seenBookingIds.has(fb.id)) {
          bookings.push(fb);
          seenBookingIds.add(fb.id);
        }
      }
      console.log(`[lookup] Enriched bookings from bookings-for-customer: ${results.length} results`);
    }
  } catch (e) { console.error('[lookup] bookings-for-customer fallback failed:', e); }
}
```

## Issue 3: Cancel booking endpoint uses wrong HTTP method

The API spec clearly shows the cancel endpoint uses `PATCH`, not `POST`. The current `executeCancelBooking` (line 1490) sends `POST`.

**File: `supabase/functions/widget-ai-chat/index.ts`**

Change line 1491 from `method: 'POST'` to `method: 'PATCH'`:
```typescript
const resp = await fetch(`${API_BASE}/v1/bookings/${bookingId}/cancel/`, {
  method: 'PATCH',
  headers: { 'Authorization': `Token ${noddiToken}`, 'Accept': 'application/json', 'Content-Type': 'application/json' },
  body: JSON.stringify(body),
});
```

The `cancellation_reason` body field may not be part of the PATCH spec (which only takes `booking_id` and `notify_customer` as query params). Update to use query params instead:
```typescript
const url = new URL(`${API_BASE}/v1/bookings/${bookingId}/cancel/`);
url.searchParams.set('booking_id', String(bookingId));
// notify_customer defaults to true per API spec
const resp = await fetch(url.toString(), {
  method: 'PATCH',
  headers: { 'Authorization': `Token ${noddiToken}`, 'Accept': 'application/json', 'Content-Type': 'application/json' },
});
```

---

## Summary of File Changes

| File | Change |
|------|--------|
| `src/widget/components/blocks/BookingSelectBlock.tsx` | Vertical stack layout for 1-2 bookings, horizontal scroll for 3+ |
| `supabase/functions/widget-ai-chat/index.ts` | 1) Expand booking data extraction with fallback fields and bookings-for-customer endpoint 2) Fix cancel to use PATCH with query params |

## Expected Results
1. Booking cards display vertically (full width) when 2 or fewer, making all details visible
2. All active bookings show complete data (date, time, address, vehicle) by enriching from the bookings-for-customer endpoint
3. Cancel booking works correctly using the PATCH method per the Noddi API spec
