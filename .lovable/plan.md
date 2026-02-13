

# Fix: `available_items` 502 — Noddi API requires `license_plates`

## Root Cause

The previous fix removed the car-info guard on the `available_items` call, allowing it to fire with only `address_id`. However, the Noddi API **requires** the `license_plates` field — it returns a 400 validation error without it.

The real problem is upstream: the AI emits the `[TIME_SLOT]` marker without `license_plate` or `car_ids`. The component needs both `address_id` AND at least one vehicle identifier to resolve sales items.

## Fix (1 file)

**File: `src/widget/components/blocks/TimeSlotBlock.tsx`**

1. **Restore the car-info guard** on the `available_items` call (revert line 59 to require `licensePlate` or `carIds`):

```typescript
if (salesItemIds.length === 0 && (licensePlate || carIds.length > 0)) {
```

2. **Improve the error message** when no sales items can be resolved (the guard after the call on line 78) to be more specific about what's missing:

```typescript
if (salesItemIds.length === 0) {
  setError('Mangler kjøretøyinformasjon for å finne ledige tider. Prøv igjen.');
  setLoading(false);
  return;
}
```

3. **Add a localStorage fallback**: Before giving up, scan `localStorage` for previously stored `license_plate` or `car_ids` from earlier steps in the same conversation (e.g., from `noddi_action_*` keys), similar to how `BookingSummaryBlock` recovers `delivery_window_id`:

```typescript
// After the guard check, before giving up:
if (salesItemIds.length === 0 && !licensePlate && carIds.length === 0) {
  // Scan localStorage for license plate from earlier conversation steps
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (!key?.startsWith('noddi_action_')) continue;
    try {
      const stored = JSON.parse(localStorage.getItem(key) || '');
      if (stored.license_plate) {
        // Use recovered license plate for available_items
        const recoveryPayload = {
          action: 'available_items',
          address_id: addressId,
          license_plates: [stored.license_plate],
        };
        const recoveryData = await postJson(recoveryPayload);
        // ... extract salesItemIds from response
        break;
      }
    } catch { /* skip */ }
  }
}
```

## Scope

| File | Change |
|------|--------|
| `src/widget/components/blocks/TimeSlotBlock.tsx` | Restore car-info guard, add localStorage recovery for missing license plate, improve error message |

No edge function changes needed.

