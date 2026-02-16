
# Fix: Missing Booking Details + Failed Tool + Empty Error Traces

## Problem 1: BOOKING_INFO card only shows date and time (no address, car, service)

**Root cause**: In `executeLookupCustomer` (line 993), the booking mapping does:
```
address: b.address?.full_address || b.address || null
```
The Noddi API address object has `street_name`, `street_number`, `zip_code`, `city` -- but NOT `full_address`. So `b.address?.full_address` is undefined, and it falls back to `b.address` (the raw object). Then `patchBookingInfo` tries to read `bookingData.address.address` and `bookingData.address.full_address` -- both undefined -- resulting in an empty string.

The same code at line 913-920 (stored addresses) CORRECTLY constructs the address string from parts. The booking mapping just forgot to do the same.

Similarly, line 995 uses `b.car.license_plate` but the Noddi field is `license_plate_number`.

**Fix**: In `executeLookupCustomer`, construct address and vehicle strings properly in the booking mapping (lines 985-999):

```typescript
// Line 993 - construct address from parts (same as storedAddresses logic)
address: (() => {
  if (!b.address) return null;
  if (typeof b.address === 'string') return b.address;
  const sn = b.address.street_name || '';
  const num = b.address.street_number || '';
  const zip = b.address.zip_code || '';
  const city = b.address.city || '';
  return `${sn} ${num}, ${zip} ${city}`.replace(/\s+/g, ' ').trim().replace(/^,|,$/g, '').trim() || null;
})(),

// Line 995 - use license_plate_number
vehicle: b.car 
  ? `${b.car.make || ''} ${b.car.model || ''} (${b.car.license_plate_number || b.car.license_plate || ''})`.trim() 
  : null,
```

## Problem 2: `get_booking_details` fails with HTTP 405

The `GET /v1/bookings/27502/` endpoint returns 405 Method Not Allowed. This causes the AI to error and retry, wasting tool iterations.

**Fix**: Since `lookup_customer` already returns full booking data, log a `saveErrorDetails` when this tool fails AND instruct the AI in the error response to use data from `lookup_customer` instead. Also save tool-level errors to the error traces.

## Problem 3: Error traces dashboard shows rows but no error_details

`saveErrorDetails` is only called for loop breaks, exhaustion, and OpenAI API errors. Individual tool failures (like the 405) are silently returned as tool messages. They never get logged to `error_details`.

**Fix**: After each tool execution, check if the result contains an error and call `saveErrorDetails`.

---

## Technical Changes

### File: `supabase/functions/widget-ai-chat/index.ts`

**Change A** -- Fix address construction in `executeLookupCustomer` booking mapping (line 993):

Replace:
```
address: b.address?.full_address || b.address || null,
```
With address construction from parts (reusing the same logic already at lines 909-913):
```
address: (() => {
  if (!b.address) return null;
  if (typeof b.address === 'string') return b.address;
  const sn = b.address.street_name || '';
  const num = b.address.street_number || '';
  const zip = b.address.zip_code || '';
  const city = b.address.city || '';
  return `${sn} ${num}, ${zip} ${city}`.replace(/\s+/g,' ').trim().replace(/^,|,$/g,'').trim() || null;
})(),
```

**Change B** -- Fix vehicle license plate in booking mapping (line 995):

Replace:
```
vehicle: b.car ? `${b.car.make || ''} ${b.car.model || ''} (${b.car.license_plate || ''})`.trim() : null,
```
With:
```
vehicle: b.car ? `${b.car.make || ''} ${b.car.model || ''} (${b.car.license_plate_number || b.car.license_plate || ''})`.trim() : null,
```

**Change C** -- Log tool-level errors to error_details (around lines 1837-1846):

After each tool execution, check if the result contains an error and log it:
```typescript
const result = await executeTool(...);

// Log tool errors to error_details for the Error Traces dashboard
try {
  const parsed = JSON.parse(result);
  if (parsed.error) {
    await saveErrorDetails(supabase, dbConversationId, 'tool_error', 
      `${toolName}: ${parsed.error}`);
  }
} catch {}

currentMessages.push({ role: 'tool', content: result, tool_call_id: toolCall.id });
```

### Deploy

Re-deploy `widget-ai-chat` edge function.

## Expected Results

1. BOOKING_INFO card will show all fields: address ("Slemdalsvingen 65, 0374 Oslo"), car ("Tesla Model Y (EC94156)"), service, date, and time
2. Tool failures like `get_booking_details` 405 will be logged to error_details and visible in the Error Traces dashboard
3. The Error Traces dashboard will show detailed error information when rows are expanded
