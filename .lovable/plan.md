

# Fix: Embla Carousel, User Group Filtering, and Complete Booking Data

## Issue 1: Replace inline scroll with Embla Carousel

The current `BookingSelectBlock` uses raw CSS `overflow-x: auto` for horizontal scrolling. This produces a standard browser scrollbar instead of a proper swipeable carousel. The project already has `embla-carousel-react` installed and a fully functional `Carousel` component at `src/components/ui/carousel.tsx`.

**Fix**: Rewrite `BookingSelectBlock` to use the existing `Carousel`, `CarouselContent`, and `CarouselItem` components. For 1-2 bookings, keep the vertical stack layout (no carousel needed). For 3+ bookings, wrap cards in the Embla carousel with `basis-[85%]` so users can see a peek of the next card and swipe between them.

**File: `src/widget/components/blocks/BookingSelectBlock.tsx`**

- Import `Carousel`, `CarouselContent`, `CarouselItem` from `@/components/ui/carousel`
- For 3+ bookings: render cards inside `<Carousel><CarouselContent><CarouselItem>` with `basis-[85%]` sizing
- For 1-2 bookings: keep vertical flex column (no carousel)
- Add dot indicators showing current slide position using the Carousel API
- Remove all raw CSS scroll logic (`overflowX`, `scrollSnapType`, `scrollSnapAlign`)

## Issue 2: Filter bookings by selected user group

The user "Joachim Rathke" is a member of multiple Noddi user groups (personal group + "Lomundal Oslo AS"). Booking #27483 belongs to "Lomundal Oslo AS" and is completed -- it should not appear. The current code at line 1170-1172 auto-selects the default/personal user group, but then line 1179-1232 collects bookings from ALL user groups indiscriminately (iterating over every group's `priority_booking` and `upcoming_bookings`).

**Fix**: Only collect bookings from the selected user group, not all groups.

**File: `supabase/functions/widget-ai-chat/index.ts`**

In `executeLookupCustomer` (lines 1179-1199):

- After determining `userGroupId` (line 1170-1172), only extract `priority_booking` and `upcoming_bookings` from the matching group
- Filter `unpaid_bookings` by `user_group_id === userGroupId`
- When calling `bookings-for-customer` fallback (line 1214), use the selected `userGroupId`
- Also include `all_user_groups` metadata in the response so the AI can mention which group is selected, and in a future iteration the widget could show a group selector

```typescript
// Only collect bookings from the SELECTED user group
const selectedGroup = userGroups.find((g: any) => g.id === userGroupId);
if (selectedGroup) {
  const pb = selectedGroup.bookings_summary?.priority_booking;
  if (pb?.id && !seenBookingIds.has(pb.id)) {
    bookings.push(pb);
    seenBookingIds.add(pb.id);
  }
  const upcoming = selectedGroup.bookings_summary?.upcoming_bookings;
  if (Array.isArray(upcoming)) {
    for (const ub of upcoming) {
      if (ub?.id && !seenBookingIds.has(ub.id)) {
        bookings.push(ub);
        seenBookingIds.add(ub.id);
      }
    }
  }
}

// Filter unpaid_bookings to selected group only
for (const ub of (lookupData.unpaid_bookings || [])) {
  if (ub?.id && !seenBookingIds.has(ub.id) && (!ub.user_group_id || ub.user_group_id === userGroupId)) {
    bookings.push(ub);
    seenBookingIds.add(ub.id);
  }
}
```

Also include the user group info in the response so the AI knows which group is active:

```typescript
customer: {
  ...existing fields,
  userGroupName: selectedGroup?.name || '',
  allUserGroups: userGroups.map((g: any) => ({ id: g.id, name: g.name, is_personal: g.is_personal })),
},
```

## Issue 3: Missing sales items and license plates in booking cards

The `patchBookingInfo` creates the `[BOOKING_SELECT]` payload (lines 542-554) but only maps basic fields. The booking data returned by `executeLookupCustomer` already includes `services[]`, `vehicle`, and `license_plate` -- but the mapping in `patchBookingInfo` doesn't extract them fully.

**Fix**: Enhance the `[BOOKING_SELECT]` payload mapping to include:
- `service`: Join all services from the `services` array (not just `services[0]`)
- `vehicle`: Include the full vehicle string with license plate
- `license_plate`: Dedicated field for plate number

**File: `supabase/functions/widget-ai-chat/index.ts`** (in `patchBookingInfo`, line 543-550):

```typescript
const bookingsPayload = toolResult.bookings.map((b: any) => ({
  id: b.id,
  service: Array.isArray(b.services) ? b.services.join(', ') : (b.service || 'Bestilling'),
  date: b.scheduledAt?.split(',')[0] || '',
  time: b.timeSlot || '',
  address: b.address || '',
  vehicle: b.vehicle || '',
  license_plate: b.license_plate || '',
}));
```

**File: `src/widget/components/blocks/BookingSelectBlock.tsx`**: Add `license_plate` to the `BookingOption` interface and render it in the card body if present (as a separate row or appended to vehicle).

---

## Technical Details

### BookingSelectBlock with Embla Carousel

The widget uses inline styles (no Tailwind) for isolation, but the Embla Carousel component uses Tailwind classes. Since `BookingSelectBlock` is rendered inside the widget's shadow DOM / iframe context, we need to ensure the carousel works. The existing carousel component uses standard Tailwind classes that are available in the widget build.

For 3+ bookings:
```tsx
<Carousel opts={{ align: 'start' }}>
  <CarouselContent className="-ml-2">
    {bookings.map(b => (
      <CarouselItem key={b.id} className="pl-2 basis-[85%]">
        {/* booking card */}
      </CarouselItem>
    ))}
  </CarouselContent>
</Carousel>
```

For 1-2 bookings: standard vertical flex layout with full-width cards (no carousel).

### Dot indicators

Below the carousel, render dots showing the current position:
```tsx
<div style={{ display: 'flex', justifyContent: 'center', gap: '6px', marginTop: '8px' }}>
  {bookings.map((_, i) => (
    <div key={i} style={{
      width: '8px', height: '8px', borderRadius: '50%',
      background: i === currentSlide ? primaryColor : '#cbd5e1',
    }} />
  ))}
</div>
```

### File changes summary

| File | Change |
|------|--------|
| `src/widget/components/blocks/BookingSelectBlock.tsx` | Replace raw scroll with Embla Carousel for 3+ bookings; add license_plate field; add dot indicators |
| `supabase/functions/widget-ai-chat/index.ts` | 1) Filter bookings to selected user group only 2) Enhance BOOKING_SELECT payload with full service list and license plate 3) Include user group metadata in response |

### Deploy
Re-deploy `widget-ai-chat` edge function after changes.

