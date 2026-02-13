

# PATCH Bookings + Auto-Sync Noddi API Schema

Two goals: (1) download and maintain a local copy of the Noddi OpenAPI schema so we always have accurate endpoint documentation, and (2) implement the `PATCH /v1/bookings/{booking_id}/` endpoint to support editing and cancelling bookings through the chatbot.

---

## Part 1: Noddi API Schema Auto-Sync

### What we build

A script that downloads the Noddi OpenAPI schema from `https://api.noddi.co/docs/schema/` and saves it locally as a JSON file for reference.

### Files

- **`scripts/sync-noddi-schema.ts`** -- A small TypeScript script (run with `tsx`) that fetches the schema and writes it to `docs/noddi-api-schema.json`. Can be run manually or scheduled.
- **`docs/noddi-api-schema.json`** -- The downloaded schema file (gitignored initially, or committed for team access).
- **`package.json`** -- Add a script: `"sync-noddi-schema": "tsx scripts/sync-noddi-schema.ts"`

The script will:
1. Fetch `https://api.noddi.co/docs/schema/?format=json`
2. Write to `docs/noddi-api-schema.json` with a timestamp comment
3. Log success/failure

> Note: Automated daily scheduling (e.g., GitHub Actions cron) can be added later. For now, running `npm run sync-noddi-schema` before making API changes ensures you have the latest docs.

---

## Part 2: PATCH Booking Endpoint Integration

### Current state

We already have these booking management tools in `widget-ai-chat`:
- `get_booking_details` -- GET `/v1/bookings/{id}/`
- `reschedule_booking` -- POST `/v1/bookings/{id}/reschedule/` (only sends `new_start_time`)
- `cancel_booking` -- POST `/v1/bookings/{id}/cancel/`

What's missing: a general `PATCH /v1/bookings/{id}/` call that can update address, cars, sales items, and delivery window on an existing booking.

### New tool: `update_booking`

**File: `supabase/functions/widget-ai-chat/index.ts`**

Add a new OpenAI tool definition:

```typescript
{
  type: 'function',
  function: {
    name: 'update_booking',
    description: 'Update an existing booking. Can change address, cars, sales items, or delivery window. Always confirm changes with the customer first.',
    parameters: {
      type: 'object',
      properties: {
        booking_id: { type: 'number', description: 'The Noddi booking ID to update' },
        address_id: { type: 'number', description: 'New address ID (from address lookup)' },
        delivery_window_id: { type: 'number', description: 'New delivery window ID' },
        delivery_window_start: { type: 'string', description: 'New delivery window start (ISO 8601)' },
        delivery_window_end: { type: 'string', description: 'New delivery window end (ISO 8601)' },
        cars: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              license_plate: { type: 'object', properties: { number: { type: 'string' }, country_code: { type: 'string' } } },
              selected_sales_item_ids: { type: 'array', items: { type: 'number' } },
            },
          },
          description: 'Updated cars array with license plates and selected sales items',
        },
      },
      required: ['booking_id'],
    },
  },
}
```

Add the execution function:

```typescript
async function executeUpdateBooking(
  bookingId: number,
  updates: { address_id?: number; delivery_window_id?: number;
             delivery_window_start?: string; delivery_window_end?: string;
             cars?: any[] }
): Promise<string> {
  // Build PATCH payload with only provided fields
  // Call PATCH /v1/bookings/{bookingId}/
  // Return success/failure with updated booking details
}
```

Add the tool dispatch case in the main handler (alongside existing `reschedule_booking`, `cancel_booking`, etc.).

### New proxy action: `update_booking`

**File: `supabase/functions/noddi-booking-proxy/index.ts`**

Add a new case to the switch:

```typescript
case "update_booking": {
  const { booking_id, ...updateFields } = body;
  if (!booking_id) return jsonResponse({ error: "booking_id required" }, 400);

  const patchPayload: any = {};
  if (updateFields.address_id) patchPayload.address_id = updateFields.address_id;
  if (updateFields.delivery_window_id) {
    patchPayload.delivery_window = {
      id: updateFields.delivery_window_id,
      starts_at: updateFields.delivery_window_start,
      ends_at: updateFields.delivery_window_end,
    };
  }
  if (updateFields.cars) patchPayload.cars = updateFields.cars;

  const res = await fetch(`${API_BASE}/v1/bookings/${booking_id}/`, {
    method: "PATCH",
    headers,
    body: JSON.stringify(patchPayload),
  });
  // Handle response...
}
```

### System prompt updates

**File: `supabase/functions/widget-ai-chat/index.ts`** (system prompt section around line 1020)

Update the hardcoded flow and marker instructions to guide the AI through edit flows:

```
When a customer wants to modify a booking:
1. Use get_booking_details to fetch the current booking
2. Ask what they want to change:
   - "Endre tidspunkt" (change time) -> show TIME_SLOT picker, then update_booking
   - "Endre adresse" (change address) -> show ADDRESS_SEARCH, then update_booking
   - "Endre bil" (change car) -> show LICENSE_PLATE, then update_booking
   - "Legge til tjenester" (add services) -> show SERVICE_SELECT, then update_booking
   - "Avbestille" (cancel) -> use cancel_booking (existing)
3. After collecting the new value, show a CONFIRM block summarizing the change
4. On confirmation, call update_booking with only the changed fields
```

### New UI block: `BookingEditConfirmBlock`

**File: `src/widget/components/blocks/BookingEditConfirmBlock.tsx`**

A new interactive block (similar to `BookingSummaryBlock`) that:
- Shows what's being changed (old value -> new value)
- Has Confirm/Cancel buttons
- Calls `update_booking` via the proxy on confirm
- Marker: `[BOOKING_EDIT]{"booking_id": 123, "changes": {...}}[/BOOKING_EDIT]`

Register it in `src/widget/components/blocks/registry.ts`.

---

## Part 3: Documentation Updates

**File: `docs/NODDI_API_ENDPOINTS.md`**

Add the new PATCH endpoint to Section 7 (Booking Management):

```
### Update Booking (PATCH)

| | |
|---|---|
| **Method** | `PATCH` |
| **URL** | `/v1/bookings/{booking_id}/` |
| **Edge Functions** | `widget-ai-chat`, `noddi-booking-proxy` |
| **Body** | Only include fields being changed |

Supported fields:
- `address_id` (int) -- new address
- `delivery_window` ({id, starts_at, ends_at}) -- new time slot
- `cars` ([{license_plate: {number, country_code}, selected_sales_item_ids: [int]}])

Gotchas:
- This is PATCH (partial update), not PUT -- only send changed fields
- delivery_window is an object, not a flat ID
- Cars array replaces the entire cars list (not a merge)
```

Update the Edge Function mapping table to include `update_booking`.

---

## Summary of all file changes

| File | Action |
|---|---|
| `scripts/sync-noddi-schema.ts` | Create -- schema download script |
| `docs/noddi-api-schema.json` | Created by script -- local schema cache |
| `package.json` | Add `sync-noddi-schema` script |
| `supabase/functions/noddi-booking-proxy/index.ts` | Add `update_booking` case |
| `supabase/functions/widget-ai-chat/index.ts` | Add `update_booking` tool + executor + system prompt updates |
| `src/widget/components/blocks/BookingEditConfirmBlock.tsx` | Create -- edit confirmation UI |
| `src/widget/components/blocks/registry.ts` | Register new block |
| `docs/NODDI_API_ENDPOINTS.md` | Add PATCH endpoint docs |

### Deployment

- Redeploy `noddi-booking-proxy` and `widget-ai-chat` edge functions after changes

