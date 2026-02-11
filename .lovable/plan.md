

# Create Address Search Block with Delivery Area Check

## Overview

Add a new interactive block component to the widget's block registry that allows customers to search for their address (using Noddi's address suggestions API) and check whether Noddi delivers to that location. The component will match the combobox-style UI shown in the screenshot -- a dropdown with search, address suggestions, and a clear button.

## How It Works

1. Customer types an address in the search field
2. The widget calls a new edge function that proxies to `v1/addresses/suggestions?input=...` on the Noddi API
3. Suggestions appear in a dropdown (street name, city, country)
4. Customer selects an address
5. The edge function calls `v1/addresses/create-from-google-place-id/` with the selected suggestion's `place_id`
6. The response includes `is_in_delivery_area` -- the block shows a green checkmark or red warning accordingly
7. The result (address + delivery status) is sent back to the AI conversation as the block action value

## New Files

### 1. Edge Function: `supabase/functions/noddi-address-lookup/index.ts`

A single edge function with two actions:

- **`suggestions`** (GET-style): Takes `input` query string, calls `GET {API_BASE}/v1/addresses/suggestions/?input={input}` with `NODDI_API_TOKEN`, returns the list of address suggestions
- **`resolve`** (POST-style): Takes `place_id`, calls `POST {API_BASE}/v1/addresses/create-from-google-place-id/` with `{ place_id }`, returns the full address object including `is_in_delivery_area`

Both use the existing `NODDI_API_TOKEN` and `NODDI_API_BASE` secrets (already configured).

### 2. Block Component: `src/widget/components/blocks/AddressSearchBlock.tsx`

A self-registering block (following the same pattern as `TextInputBlock`, `PhoneVerifyBlock`, etc.):

- **Marker**: `[ADDRESS_SEARCH]` / `[/ADDRESS_SEARCH]`
- **Type**: `address_search`
- **UI**: 
  - A combobox-style input with a map pin icon
  - Debounced search (300ms) that calls the edge function for suggestions
  - Dropdown list showing suggestions (street, city, country)
  - On selection: calls the edge function to resolve the place_id
  - Shows delivery status result (green check "We deliver here!" or red warning "Outside delivery area")
  - Clear button to reset
- **onAction**: Sends a JSON string with `{ address, is_in_delivery_area }` back to the conversation

### 3. Widget API: Add functions to `src/widget/api.ts`

Two new exported functions:
- `searchAddressSuggestions(widgetKey, input)` -- calls the edge function suggestions action
- `resolveAddress(widgetKey, placeId)` -- calls the edge function resolve action

### 4. Register in `src/widget/components/blocks/index.ts`

Add `import './AddressSearchBlock';` to trigger self-registration.

## Technical Details

### Edge Function (`supabase/functions/noddi-address-lookup/index.ts`)

```typescript
// Handles two actions:
// POST { action: "suggestions", input: "slemdalsvingen" }
//   -> proxies to GET {API_BASE}/v1/addresses/suggestions/?input=slemdalsvingen
//   -> returns { suggestions: [...] }
//
// POST { action: "resolve", place_id: "ChIJ..." }
//   -> proxies to POST {API_BASE}/v1/addresses/create-from-google-place-id/
//   -> returns { address: { street_name, city, is_in_delivery_area, ... } }
```

Uses existing `NODDI_API_TOKEN` and `NODDI_API_BASE` secrets. CORS headers included. No JWT verification needed (widget-facing).

### Block Component Structure

```typescript
// AddressSearchBlock.tsx
// States: idle -> searching -> showing suggestions -> resolving -> result
// 
// Result display:
//   is_in_delivery_area === true  -> green badge "We deliver to {address}!"
//   is_in_delivery_area === false -> amber badge "Sorry, we don't deliver to {address} yet"
//
// Submitted state (after onAction called):
//   Shows the confirmed address with a checkmark (same pattern as TextInputBlock)
```

### Preview Component for Flow Builder

A small static preview showing the combobox with a map pin icon and "Search address..." placeholder, matching the style of other block previews.

### Config TOML Entry

```toml
[functions.noddi-address-lookup]
verify_jwt = false
```

## Files Summary

| File | Action |
|------|--------|
| `supabase/functions/noddi-address-lookup/index.ts` | Create -- edge function proxying Noddi address APIs |
| `supabase/config.toml` | Edit -- add `verify_jwt = false` for new function |
| `src/widget/components/blocks/AddressSearchBlock.tsx` | Create -- self-registering block component |
| `src/widget/components/blocks/index.ts` | Edit -- add import for AddressSearchBlock |
| `src/widget/api.ts` | Edit -- add `searchAddressSuggestions` and `resolveAddress` functions |
