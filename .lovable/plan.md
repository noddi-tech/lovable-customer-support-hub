
# New BookingSelectBlock: Carousel with Multi-Select for Multiple Bookings

## Problem

When a customer has 2+ active bookings, `patchBookingInfo` generates an `[ACTION_MENU]` listing them as text options. Then `patchActionMenu` sees this menu is missing "Avbestille" and **overwrites it** with the standard 5-option edit menu. Result: the user sees edit actions instead of their bookings.

Beyond that bug, an ACTION_MENU is the wrong UI pattern for booking selection -- it's just text pills. The user wants **booking cards** (like BOOKING_INFO cards) in a scrollable carousel with **multi-select checkboxes**, so they can select one or more bookings before proceeding.

## Solution

Create a new `[BOOKING_SELECT]` block that:
- Renders each booking as a styled card (reusing BOOKING_INFO card design)
- Adds a checkbox to each card for multi-select
- Includes a "Continue" button that sends the selected booking IDs back
- Replaces the current ACTION_MENU hack in `patchBookingInfo`

## Changes

### 1. New file: `src/widget/components/blocks/BookingSelectBlock.tsx`

A new registered block with:
- **Marker**: `[BOOKING_SELECT]...[/BOOKING_SELECT]`
- **Parse**: Expects a JSON array of booking objects inside the markers
- **UI**: Horizontal scrollable carousel of booking cards, each with:
  - Booking details (service, date, time, address, car) in the same blue-themed card style as BOOKING_INFO
  - A checkbox overlay for selection (toggle on click)
  - Selected state highlighted with primary color border
- **Multi-select**: Users can tap one or more cards
- **Confirm button**: "Fortsett" button at the bottom, disabled until at least 1 booking is selected
- **onAction**: Sends selected booking IDs as a JSON string (e.g., `{"selected_ids": [123, 456]}`) back to the conversation as a hidden message
- **Used state**: Once submitted, cards become read-only with selection visible

### 2. Update `src/widget/components/blocks/index.ts`

Add `import './BookingSelectBlock';` to register the new block.

### 3. Update `supabase/functions/widget-ai-chat/index.ts`

**In `patchBookingInfo` (line 542-552)**:
Replace the ACTION_MENU generation for multiple bookings with the new `[BOOKING_SELECT]` marker:

```typescript
if (toolResult.bookings && toolResult.bookings.length > 1) {
  const bookingsPayload = toolResult.bookings.map((b: any) => ({
    id: b.id,
    service: b.services?.[0] || b.service || 'Bestilling',
    date: b.scheduledAt?.split(',')[0] || '',
    time: b.timeSlot || '',
    address: b.address || '',
    vehicle: b.vehicle || '',
  }));
  const marker = `Du har ${toolResult.bookings.length} aktive bestillinger. Velg hvilke(n) det gjelder:\n\n[BOOKING_SELECT]${JSON.stringify(bookingsPayload)}[/BOOKING_SELECT]`;
  return marker;
}
```

**In `patchActionMenu` (line 710-717)**:
Add a guard to skip when `[BOOKING_SELECT]` is present:
```typescript
if (reply.includes('[BOOKING_SELECT]')) return reply;
```

### 4. Update `AiChat.tsx` handling

The `handleActionSelect` callback already handles hidden messages. When the BookingSelectBlock sends the selected IDs, the AI receives them and can proceed with the next step (showing ACTION_MENU for the selected booking(s)).

---

## Technical Details

### BookingSelectBlock Component Structure

```
+------------------------------------------+
| Du har 2 aktive bestillinger.            |
|                                          |
| +------------------+ +------------------+|
| | [x] Bestilling   | | [ ] Bestilling   ||
| |     #12345       | |     #12346       ||
| | -----------      | | -----------      ||
| | Adresse: ...     | | Adresse: ...     ||
| | Dato: 18. feb    | | Dato: 20. feb    ||
| | Tid: 07:00-12:00 | | Tid: 09:00-14:00 ||
| | Bil: Tesla MY    | | Bil: VW Golf     ||
| +------------------+ +------------------+|
|                                          |
|          [ Fortsett (1 valgt) ]          |
+------------------------------------------+
```

- Cards scroll horizontally if more than 2
- Checkbox in top-right corner of each card
- Selected card gets a thicker primary-color border
- "Fortsett" button shows count of selected bookings

### File changes summary

| File | Change |
|------|--------|
| `src/widget/components/blocks/BookingSelectBlock.tsx` | New file -- block component |
| `src/widget/components/blocks/index.ts` | Add import |
| `supabase/functions/widget-ai-chat/index.ts` | Replace ACTION_MENU with BOOKING_SELECT in patchBookingInfo; add guard in patchActionMenu |
