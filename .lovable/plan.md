

# Improve Recent Booking card formatting and add service tags

## Problem
The "Recent Booking" card in Customer Details shows:
1. Raw `WHEEL_STORAGE_PICKUP` as text instead of a human-readable, styled badge
2. No service tags (dekkhotell, dekkskift, etc.) — these exist in `data.ui_meta.order_tags` but are only rendered at the very bottom of the details section, not inside the booking card itself
3. The booking type badge only handles `wheel_storage_pickup` — other types show raw API strings

## Solution

### 1. Format booking_type into readable labels with proper styling
**File: `src/components/dashboard/voice/NoddiCustomerDetails.tsx`** (lines 471-475)

Add a `formatBookingType` helper that maps known booking types to human-readable labels:
- `wheel_storage_pickup` → "Wheel Storage Pickup"
- `wheel_storage_delivery` → "Wheel Storage Delivery"  
- `normal` → (hidden)
- Others → title-case the snake_case string

### 2. Move service tags into the booking card
**File: `src/components/dashboard/voice/NoddiCustomerDetails.tsx`**

Add the service tags (using existing `getServiceTagStyle`) inside the booking card, right after the status chips and before the date/service/vehicle details (around line 548). Currently they only appear at line 1045 — we'll show them in both places or move them into the card.

### 3. Apply same fix to mobile view
**File: `src/components/mobile/conversations/MobileCustomerSummaryCard.tsx`** (line 226)

Use the same `formatBookingType` helper for consistency.

## Technical details

**New helper function:**
```typescript
const formatBookingType = (type: string): string => {
  if (type === 'normal') return '';
  const map: Record<string, string> = {
    wheel_storage_pickup: 'Wheel Storage Pickup',
    wheel_storage_delivery: 'Wheel Storage Delivery',
    tire_change: 'Tire Change',
  };
  return map[type] || type.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
};
```

**Service tags placement** — insert after status chips (line ~548), before date:
```tsx
{data.ui_meta?.order_tags && data.ui_meta.order_tags.length > 0 && (
  <div className="flex flex-wrap gap-1 mb-1">
    {data.ui_meta.order_tags.map((tag: string, idx: number) => {
      const style = getServiceTagStyle(tag);
      const IconComponent = style.icon;
      return (
        <span key={idx} className={`inline-flex items-center gap-1 px-2 py-0.5 text-[10px] rounded-full ${style.bg} ${style.text}`}>
          {IconComponent && <IconComponent className="w-3 h-3" />}
          {tag}
        </span>
      );
    })}
  </div>
)}
```

### Files to modify
- `src/components/dashboard/voice/NoddiCustomerDetails.tsx` — add `formatBookingType`, insert service tags in booking card
- `src/components/mobile/conversations/MobileCustomerSummaryCard.tsx` — use `formatBookingType`

