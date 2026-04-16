

# Migrate from `priority_booking` to `upcoming_booking` / `recent_booking`

## Context
The Noddi API has replaced `bookings_summary.priority_booking` with two new fields:
- `upcoming_booking` — next upcoming booking (full detail)
- `recent_booking` — most recently completed booking (full detail)

The legacy `priority_booking` field is kept temporarily but will be removed. Both new fields are full `CustomerLookupBookingRecord` objects with service details, vehicle info, address, etc. — solving the "completed bookings lack details" problem.

## Changes

### File: `supabase/functions/noddi-customer-lookup/index.ts`

**1. Update priority booking extraction (two locations: ~line 1336 and ~line 1551)**

Replace the current logic that reads `group.bookings_summary.priority_booking` with:
```
upcoming = group.bookings_summary?.upcoming_booking
recent   = group.bookings_summary?.recent_booking
legacy   = group.bookings_summary?.priority_booking  // fallback
```

Priority selection logic:
- If `upcoming_booking` exists → use it, type = `'upcoming'`
- Else if `recent_booking` exists → use it, type = `'completed'`
- Else fall back to legacy `priority_booking` (backward compat)

This applies to both the email-lookup path (~line 1335) and the phone-lookup path (~line 1550).

**2. Update `all_user_groups` formatting (two locations: ~line 1409 and ~line 1653)**

Add `upcoming_booking` and `recent_booking` to each group's output alongside the legacy `priority_booking`:
```
upcoming_booking: g.bookings_summary?.upcoming_booking || null,
recent_booking: g.bookings_summary?.recent_booking || null,
priority_booking: g.bookings_summary?.priority_booking || null, // keep for now
```

**3. Enrichment may become unnecessary**

Since the new fields return full booking records, `enrichBookingIfNeeded` should rarely need to fetch `/v1/bookings/{id}/`. Keep it as a safety net — it already checks for missing fields before fetching.

### File: `src/hooks/useNoddihKundeData.ts`

**4. Add new fields to types**

Add `upcoming_booking` and `recent_booking` to the `all_user_groups` type alongside existing `booking` field.

### No frontend display changes needed

The frontend already renders whatever is in `priority_booking` — which will now contain the full booking record (either upcoming or recent). Service titles, vehicle labels, addresses, and order tags will all be present.

## Files to modify
- `supabase/functions/noddi-customer-lookup/index.ts` — use new API fields for priority booking selection
- `src/hooks/useNoddihKundeData.ts` — add types for new fields

