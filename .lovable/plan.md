

# Add Quick-Select Buttons for Stored Addresses and Cars

## Overview

The backend already extracts `stored_addresses` and `stored_cars` from the customer's booking history after phone verification. However, this data never reaches the ADDRESS_SEARCH and LICENSE_PLATE blocks. This plan adds quick-select pill buttons so returning customers can tap a saved address or car instead of typing.

## Current State

- `executeLookupCustomer` already returns `stored_addresses` (id, full_address, street, city, zip) and `stored_cars` (id, make, model, license_plate) in the tool response.
- The AI sees this data but has no way to pass it to the interactive blocks.
- Both ADDRESS_SEARCH and LICENSE_PLATE markers currently accept no structured data about stored items.

## Changes

### 1. Update AI Prompt to Pass Stored Data in Markers

**File: `supabase/functions/widget-ai-chat/index.ts`**

Update the ADDRESS_SEARCH and LICENSE_PLATE instruction blocks so the AI includes stored data when available:

- ADDRESS_SEARCH marker changes from plain text to JSON when stored addresses exist:
  ```
  [ADDRESS_SEARCH]{"stored": [{"id": 2860, "label": "Holtet 45, Oslo"}]}[/ADDRESS_SEARCH]
  ```
  Falls back to `[ADDRESS_SEARCH]Search address...[/ADDRESS_SEARCH]` when no stored addresses.

- LICENSE_PLATE marker changes from self-closing to JSON when stored cars exist:
  ```
  [LICENSE_PLATE]{"stored": [{"id": 13888, "make": "Tesla", "model": "Model Y", "plate": "EC94156"}]}[/LICENSE_PLATE]
  ```
  Falls back to `[LICENSE_PLATE]` when no stored cars.

Update the `address_search.instruction` and `license_plate.instruction` in the field-type config section (~lines 554-561) to tell the AI how to include stored data.

Update the hardcoded fallback verification context (~lines 917-929) to instruct: "If the customer has stored_addresses or stored_cars from the lookup, pass them in the ADDRESS_SEARCH / LICENSE_PLATE markers so the widget shows quick-select buttons."

### 2. Update `parseContent` for Both Blocks

**File: `src/widget/components/blocks/AddressSearchBlock.tsx`**

Update `parseContent` (line 224) to try parsing JSON first:
```typescript
parseContent: (inner) => {
  try {
    const parsed = JSON.parse(inner.trim());
    return { placeholder: 'Search address...', stored: parsed.stored || [] };
  } catch {
    return { placeholder: inner.trim() || 'Search address...', stored: [] };
  }
},
```

**File: `src/widget/components/blocks/LicensePlateBlock.tsx`**

Add a `closingMarker` and update `parseContent` (line 155) similarly:
```typescript
closingMarker: '[/LICENSE_PLATE]',
parseContent: (inner) => {
  const trimmed = inner.trim();
  if (!trimmed) return { placeholder: 'AB 12345', stored: [] };
  try {
    const parsed = JSON.parse(trimmed);
    return { placeholder: 'AB 12345', stored: parsed.stored || [] };
  } catch {
    return { placeholder: 'AB 12345', stored: [] };
  }
},
```

### 3. Add Quick-Select UI to AddressSearchBlock

**File: `src/widget/components/blocks/AddressSearchBlock.tsx`**

Before the search input (in the search state section, ~line 144), render stored address pills if `data.stored` has items:

```typescript
const storedAddresses = data.stored || [];

// Render above the search input:
{storedAddresses.length > 0 && !selected && (
  <div style={{ marginBottom: '6px' }}>
    <div style={{ fontSize: '11px', color: '#6b7280', marginBottom: '4px' }}>
      Dine lagrede adresser:
    </div>
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
      {storedAddresses.map((addr) => (
        <button
          key={addr.id}
          onClick={() => handleStoredAddressSelect(addr)}
          style={{
            padding: '5px 10px', borderRadius: '16px',
            border: '1.5px solid #e5e7eb', background: '#f9fafb',
            fontSize: '12px', cursor: 'pointer',
            display: 'flex', alignItems: 'center', gap: '4px',
          }}
        >
          <span>📍</span> {addr.label}
        </button>
      ))}
    </div>
  </div>
)}
```

Add a `handleStoredAddressSelect` function that skips the Google Places search/resolve flow and directly submits the stored address data (since we already have the `address_id`). It will call the resolve endpoint to check delivery area status, or directly submit if the address was previously confirmed.

For stored addresses, the flow is:
1. User taps a stored address pill
2. Component calls `resolveAddress` with a flag or calls the proxy to re-check delivery area (or uses a simpler approach: call the noddi-address-lookup edge function with `action: 'resolve_by_id'` and the address_id)
3. Display the result (delivery area confirmed/denied) same as normal flow

Since we already have the `address_id`, we can skip the Google search entirely and directly submit the payload with a call to the existing delivery area check.

### 4. Add Quick-Select UI to LicensePlateBlock

**File: `src/widget/components/blocks/LicensePlateBlock.tsx`**

Before the license plate input (in the main render, ~line 87), render stored car pills:

```typescript
const storedCars = data.stored || [];

{storedCars.length > 0 && !carInfo && (
  <div style={{ marginBottom: '6px' }}>
    <div style={{ fontSize: '11px', color: '#6b7280', marginBottom: '4px' }}>
      Dine lagrede biler:
    </div>
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
      {storedCars.map((car) => (
        <button
          key={car.id}
          onClick={() => handleStoredCarSelect(car)}
          style={{
            padding: '5px 10px', borderRadius: '16px',
            border: '1.5px solid #e5e7eb', background: '#f9fafb',
            fontSize: '12px', cursor: 'pointer',
            display: 'flex', alignItems: 'center', gap: '4px',
          }}
        >
          <span>🚗</span> {car.make} {car.model} ({car.plate})
        </button>
      ))}
    </div>
  </div>
)}
```

Add a `handleStoredCarSelect` function that:
1. Sets the plate input to the stored plate
2. Calls the existing `handleSubmit` logic (lookup_car API) to confirm the car details
3. Or directly submits with the stored car data (id, make, model, plate) since we already have it from the lookup -- skipping the API call entirely

The direct-submit approach is better since the car data is already confirmed:
```typescript
const handleStoredCarSelect = (car: any) => {
  setCarInfo({ id: car.id, make: car.make, model: car.model });
  setPlate(car.plate);
  const payload = JSON.stringify({
    car_id: car.id, make: car.make, model: car.model,
    license_plate: car.plate,
  });
  localStorage.setItem(`noddi_action_${blockKey}`, payload);
  onAction(payload, blockKey);
  onLogEvent?.('stored_car_selected', `${car.make} ${car.model}`, 'success');
};
```

### 5. Add Proxy Action for Address Resolve by ID (Optional Optimization)

**File: `supabase/functions/noddi-booking-proxy/index.ts`**

Add a new action `resolve_address_by_id` that takes an `address_id` and returns the address details with delivery area status. This avoids needing the Google Places resolve step for stored addresses.

Alternatively, the AddressSearchBlock can directly submit the stored address payload without re-checking delivery area, since the AI already has the `is_in_delivery_area` info from the booking history. In that case, the stored data in the marker should include `is_in_delivery_area`.

For simplicity, the first approach will be: stored addresses skip the resolve step entirely and submit directly with assumed delivery area = true (since they booked there before).

## Files to Change

1. `supabase/functions/widget-ai-chat/index.ts` -- Update AI prompt for ADDRESS_SEARCH and LICENSE_PLATE markers to include stored data
2. `src/widget/components/blocks/AddressSearchBlock.tsx` -- Add `parseContent` JSON support + stored address pill buttons + direct-submit handler
3. `src/widget/components/blocks/LicensePlateBlock.tsx` -- Add `closingMarker`, `parseContent` JSON support + stored car pill buttons + direct-submit handler

## Deployment

- `widget-ai-chat` edge function needs redeployment
- Frontend changes deploy automatically
