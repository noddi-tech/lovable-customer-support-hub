

# Fix: Booking card labels and service tags for completed bookings

## Problems identified

1. **"Recent Booking" label shown for future bookings** — Screenshot 2 shows booking #33129 dated April 21st (future) labeled "Recent Booking" instead of "Upcoming Booking". The label at line 468 uses `data.priority_booking_type`, but the frontend should also check the booking date as a fallback since the backend may not always set this correctly.

2. **No service tags on completed bookings** — Screenshot 1 shows booking #31546 (completed, service "Hente dekk") with zero service tags. The `order_tags` array from the API is empty because the summary endpoint for completed bookings may not include enough text for tag extraction, and `enrichTagsIfEmpty` may not have been triggered. The fix should attempt to extract tags client-side from `service_title` as a fallback when `order_tags` is empty.

## Solution

### 1. Smart label: use date as fallback for booking type
**File: `src/components/dashboard/voice/NoddiCustomerDetails.tsx`**

Replace the simple `priority_booking_type` check with a helper that also considers the booking date:

```typescript
const getBookingLabel = () => {
  if (data.priority_booking_type === 'upcoming') return 'Upcoming';
  if (data.priority_booking_type === 'completed') return 'Recent';
  // Fallback: check if booking date is in the future
  const dateIso = data.ui_meta?.booking_date_iso;
  if (dateIso && new Date(dateIso) > new Date()) return 'Upcoming';
  return 'Recent';
};
```

Apply this in both the link and text versions of the label (lines 468 and 473).

### 2. Client-side tag fallback from service_title
**File: `src/components/dashboard/voice/NoddiCustomerDetails.tsx`**

When `data.ui_meta.order_tags` is empty but `service_title` exists, run the same tag regex matching client-side:

```typescript
const deriveTagsFromTitle = (title: string): string[] => {
  const rules: [string, RegExp][] = [
    ["Dekkhotell", /\b(dekkhotell|tire\s*(hotel|storage))\b/i],
    ["Dekkskift", /\b(dekkskift|hjulskift|tire\s*(change|swap))\b/i],
    ["Hjemlevering", /\b(hjemlever(t|ing)|home\s*(delivery|service))\b/i],
    ["Henting/Levering", /\b(henting|levering|pickup|delivery|hente)\b/i],
    ["Felgvask", /\b(felgvask|rim\s*wash)\b/i],
  ];
  return rules.filter(([, re]) => re.test(title)).map(([label]) => label);
};

// Use: order_tags if available, else derive from service_title
const effectiveTags = (data.ui_meta?.order_tags?.length > 0)
  ? data.ui_meta.order_tags
  : deriveTagsFromTitle(data.ui_meta?.service_title || '');
```

Replace `data.ui_meta.order_tags` reference in the service tags rendering block (line 562) with `effectiveTags`.

### 3. Apply same fallback to mobile view
**File: `src/components/mobile/conversations/MobileCustomerSummaryCard.tsx`**

Add the same `deriveTagsFromTitle` fallback for the mobile booking card.

## Files to modify
- `src/components/dashboard/voice/NoddiCustomerDetails.tsx` — booking label fix + tag fallback
- `src/components/mobile/conversations/MobileCustomerSummaryCard.tsx` — tag fallback for mobile

