

# Fix: Service Names Missing in ServiceSelectBlock

## Problem

The Noddi API endpoint `/v1/sales-item-booking-categories/for-new-booking/` returns a completely different shape than expected:

```json
{
  "services": [
    { "brand": { "name": "Noddi", ... }, "type": "wheel_services" },
    { "brand": { "name": "Hurtigruta Carglass", ... }, "type": "stone_chip_repair" }
  ]
}
```

The widget expects `{ slug, name, description }` but the API returns `{ brand, type }`. Since there's no `name`, `slug`, or `label` field, the service cards render with just the icon and no text.

## Solution

Normalize the API response in the proxy so the widget always gets a consistent shape regardless of which Noddi endpoint variant returns data.

### File: `supabase/functions/noddi-booking-proxy/index.ts`

In the `list_services` case (around line 69-71), after fetching from the real API, map the raw response into the expected format:

- `type` becomes `slug` (e.g., `"wheel_services"`)
- A human-readable name is derived from `type` using a lookup map (e.g., `"wheel_services"` -> `"Dekkskift"`, `"stone_chip_repair"` -> `"Steinsprut-reparasjon"`)
- `brand.name` is preserved as extra metadata

### File: `src/widget/components/blocks/ServiceSelectBlock.tsx`

No changes needed -- once the proxy normalizes the data, the existing `s.name || s.label || slug` logic will work.

### Redeployment

The `noddi-booking-proxy` edge function will need redeployment.

## Technical Details

Add a type-to-label map in the proxy:

```typescript
const SERVICE_TYPE_LABELS: Record<string, string> = {
  wheel_services: "Dekkskift",
  stone_chip_repair: "Steinsprut-reparasjon",
  car_wash: "Bilvask",
  tyre_hotel: "Dekkhotell",
  polering: "Polering",
};
```

Then normalize the response:

```typescript
const services = (Array.isArray(data) ? data : data.results || []).map((s: any) => ({
  slug: s.type || s.slug || '',
  name: SERVICE_TYPE_LABELS[s.type] || s.name || s.type || '',
  description: s.description || '',
  brand_name: s.brand?.name || '',
}));
return jsonResponse({ services });
```

