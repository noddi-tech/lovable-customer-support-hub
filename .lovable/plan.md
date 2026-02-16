
# Fix: Wrong Booking ID Used in Update + YES_NO Conflict + Better Error Messages

## Root Cause of the 502/400 Error

The AI is using `booking_id: 13888` in the `[BOOKING_EDIT]` marker -- but `13888` is actually the **car_id**, not the booking ID. The existing `patchBookingEdit` function only replaces known placeholder IDs (12345, 99999, etc.), so `13888` passes through unchecked.

When `PATCH /v1/bookings/13888/` is called, the Noddi API updates a **completely different customer's booking** (with address "Sankt Croix gate 30, Fredrikstad"), causing the `service_department_area_not_found` error.

Your actual booking address is "Slemdalsvingen 65, Oslo" -- the wrong booking was being patched entirely.

## Three Changes

### 1. Always Override booking_id from lookup_customer (Critical)

Instead of only fixing placeholder IDs, `patchBookingEdit` should **always** try to find the real booking ID from the `lookup_customer` tool result in conversation history. The bookings array from `lookup_customer` contains the verified customer bookings.

**Logic**: Scan conversation for the `lookup_customer` tool result, extract the first active booking's `id`, and always use that as `booking_id` -- regardless of what the AI provided (since the AI frequently confuses car_ids, delivery_window_ids, and booking_ids).

### 2. Skip YES_NO When Other Interactive Markers Present

Add a guard at the top of `patchYesNo`: if the reply already contains `[ACTION_MENU]`, `[TIME_SLOT]`, `[BOOKING_EDIT]`, or other interactive markers, do not add `[YES_NO]`.

### 3. Parse Noddi-Specific Errors for User-Friendly Messages

In `BookingEditConfirmBlock.tsx`, detect the `service_department_area_not_found` error code and show: "Dette tidspunktet er dessverre ikke tilgjengelig for din adresse. Vennligst velg et annet tidspunkt."

---

## Technical Details

### File: `supabase/functions/widget-ai-chat/index.ts`

**Change A** (~line 466-493): Replace the placeholder-only check with an always-override approach:

```typescript
// ALWAYS try to extract the real booking ID from lookup_customer results
// The AI frequently confuses car_ids and delivery_window_ids with booking_ids
let realBookingId: number | null = null;
for (let i = messages.length - 1; i >= 0; i--) {
  const msg = messages[i];
  if (msg.role === 'tool' && typeof msg.content === 'string') {
    try {
      const toolResult = JSON.parse(msg.content);
      if (toolResult.bookings?.length > 0) {
        realBookingId = toolResult.bookings[0].id;
        break;
      }
    } catch { /* not JSON */ }
  }
}
if (realBookingId && realBookingId !== editData.booking_id) {
  console.log('[patchBookingEdit] Overriding AI booking_id', editData.booking_id, 'with real:', realBookingId);
  editData.booking_id = realBookingId;
}
```

**Change B** (~line 407): Add marker guard to `patchYesNo`:

```typescript
const otherMarkers = ['[ACTION_MENU]', '[TIME_SLOT]', '[BOOKING_EDIT]', 
  '[BOOKING_SUMMARY]', '[SERVICE_SELECT]', '[PHONE_VERIFY]', 
  '[ADDRESS_SEARCH]', '[LICENSE_PLATE]'];
if (otherMarkers.some(m => reply.includes(m))) return reply;
```

### File: `src/widget/components/blocks/BookingEditConfirmBlock.tsx`

**Change C** (~line 64): Parse Noddi error details for actionable messages:

```typescript
const details = typeof respData.details === 'string' ? respData.details : '';
if (details.includes('service_department_area_not_found')) {
  setError('Dette tidspunktet er dessverre ikke tilgjengelig for din adresse. Vennligst velg et annet tidspunkt.');
} else {
  setError(respData.error || 'Kunne ikke oppdatere bestillingen.');
}
```

### Deploy

Re-deploy `widget-ai-chat` edge function.

## Expected Result

1. Booking edit uses the correct booking ID from the customer's verified bookings list
2. The "Endre tid" flow no longer patches a random stranger's booking
3. YES_NO component only appears when it's the sole interactive element
4. Noddi-specific errors show clear Norwegian messages instead of raw JSON
