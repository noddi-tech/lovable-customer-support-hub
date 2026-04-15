

# Improve Tire Quotes display: links, event badges, readable labels

## Problem
1. Tire quote IDs are not linked — should link to `https://partner.noddi.co/tire-offers/{id}`
2. Status events show raw technical names like `BOOKING_PROPOSAL_TIRE_MOUNT_SENT_TO_CUSTOMER`
3. Events are plain text, not badges

## Changes

**File: `src/components/dashboard/voice/NoddiCustomerDetails.tsx`**

### 1. Add clickable link to each tire quote
Wrap the car make/model heading (line 1041-1044) in an anchor tag:
```tsx
<a href={`https://partner.noddi.co/tire-offers/${tq.id}`} target="_blank" rel="noopener noreferrer" className="font-medium hover:underline text-primary">
  {tq.car?.make} {tq.car?.model} ...
</a>
```

### 2. Create an event label mapping function
Add a helper that shortens technical event names to readable labels:

| Raw status | Display label |
|---|---|
| `BOOKING_PROPOSAL_TIRE_MOUNT_SENT_TO_CUSTOMER` | Proposal sent |
| `INVENTORY_RECEIVED_IN_FULL` | Inventory received |
| `INVENTORY_ORDERED_AT_SUPPLIERS_IN_FULL` | Ordered from supplier |
| `FULFILLED` | Fulfilled |
| Other | Title-case the last segment |

### 3. Render events as badges instead of plain text
Replace the plain `<span className="font-medium">{evt.status}</span>` (line 1069) with a small `<Badge>` using the shortened label and color-coded by event type (proposal = blue, inventory = purple, fulfilled = green, default = muted).

## Files to modify
- `src/components/dashboard/voice/NoddiCustomerDetails.tsx` — tire quotes section (lines 1037-1076)

