

# Fix: Completed bookings missing service details (tags, vehicle, address)

## Problem
When the Noddi API returns a `priority_booking` from `bookings_summary`, completed bookings have a **summary structure** that lacks detail fields like `service`, `order.tags`, `address`, `booking_type`, and vehicle info. The current enrichment logic (`enrichTagsIfEmpty`) only fetches full booking details from `/v1/bookings/{id}/` when `order.tags` is empty. If the summary happens to have tags but lacks other fields (or has neither), the service title, vehicle, address, and booking type remain null.

## Root cause
In `supabase/functions/noddi-customer-lookup/index.ts`, the enrichment gate at lines 1426 and 1672 is:
```
if (orderTags.length === 0 && priorityBooking) { ... }
```
This only enriches for missing tags. But completed booking summaries also lack `service`, `address`, `booking_type`, and vehicle data.

## Solution
**Change the enrichment condition** to always fetch full booking detail when key fields are missing — not just tags. Rename the function to `enrichBookingIfNeeded` and broaden the check.

### File: `supabase/functions/noddi-customer-lookup/index.ts`

1. **Rename `enrichTagsIfEmpty` → `enrichBookingIfNeeded`** — fetch full booking detail if tags OR service_title OR vehicle_label are missing from the summary object. Return the full detail object as `bookingForCache`.

2. **Update the condition** in both code paths (lines ~1426 and ~1672):
   - Old: `if (orderTags.length === 0 && priorityBooking)`
   - New: Always call `enrichBookingIfNeeded(priorityBooking)` when `priorityBooking` exists. The function itself decides whether to fetch based on missing fields.

3. **Update the function logic**:
   ```typescript
   async function enrichBookingIfNeeded(pb: any): Promise<{tags: string[]; bookingForCache: any}> {
     if (!pb?.id) return { tags: extractOrderTags(pb), bookingForCache: pb };
     
     const tags = extractOrderTags(pb);
     const hasService = !!extractServiceTitle(pb);
     const hasVehicle = !!extractVehicleLabel(pb);
     
     // If we already have all key data, skip the extra fetch
     if (tags.length > 0 && hasService && hasVehicle) {
       return { tags, bookingForCache: pb };
     }
     
     // Fetch full booking detail
     try {
       const r = await fetch(`${API_BASE}/v1/bookings/${pb.id}/`, { headers: noddiAuthHeaders() });
       if (r.ok) {
         const detail = await r.json();
         return { tags: extractOrderTags(detail) || tags, bookingForCache: detail };
       }
     } catch (e) { /* fallback to summary */ }
     return { tags, bookingForCache: pb };
   }
   ```

4. **Both call sites** (lines ~1421-1431 and ~1667-1677) become:
   ```typescript
   let enrichedTags = priorityBooking?.order?.tags || [];
   let bookingForCache = priorityBooking;
   if (priorityBooking) {
     const enrichResult = await enrichBookingIfNeeded(priorityBooking);
     enrichedTags = enrichResult.tags;
     bookingForCache = enrichResult.bookingForCache || priorityBooking;
   }
   ```

## Files to modify
- `supabase/functions/noddi-customer-lookup/index.ts` — broaden enrichment logic

## Impact
This adds one extra API call for completed bookings that lack detail, but it's already done for tag-less bookings today. No frontend changes needed — the `NoddiCustomerDetails` component already renders all these fields when present.

