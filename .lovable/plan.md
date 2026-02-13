
# Fix Booking Summary: JSON Parsing + Customer Lookup Recovery

## Problem

Two linked failures are preventing booking confirmation:

1. **AI emits non-JSON inside `[BOOKING_SUMMARY]`**: Instead of structured JSON, the AI is writing human-readable bullet points (e.g., "Dato og tid: 16. februar 2026, 06:00 - 11:00"). This causes `patchBookingSummary` to fail at `JSON.parse()`, so `user_id` and `user_group_id` are never injected server-side.

2. **Client-side fallback also fails**: The `BookingSummaryBlock` tries to re-lookup the customer via the `noddi-booking-proxy` `lookup_customer` action, but the Noddi API returns a 400 `user_does_not_exist` error, which the proxy treats as a hard failure instead of gracefully handling it.

The result: "Missing required fields" error for `user_id` and `user_group_id`.

## Fixes

### Fix 1: Make `BookingSummaryBlock.parseContent` more resilient (client-side)

**File: `src/widget/components/blocks/BookingSummaryBlock.tsx`** (line ~257-263)

Update `parseContent` to handle non-JSON content gracefully by extracting what it can from the text:

```typescript
parseContent: (inner) => {
  try {
    return JSON.parse(inner.trim());
  } catch {
    // AI emitted human-readable text instead of JSON — extract what we can
    const data: any = { summary: inner.trim() };
    // Try to extract key-value pairs from text like "Address: ..." 
    const dateMatch = inner.match(/(\d{1,2}\.\s*\w+\s*\d{4})/);
    if (dateMatch) data.date = dateMatch[1];
    const priceMatch = inner.match(/(\d+)\s*kr/i);
    if (priceMatch) data.price = priceMatch[0];
    return data;
  }
}
```

### Fix 2: Make `patchBookingSummary` handle non-JSON gracefully (server-side)

**File: `supabase/functions/widget-ai-chat/index.ts`** (line ~296-363)

When JSON parsing fails, attempt to reconstruct the JSON from conversation context (previous tool results contain user_id, delivery_window_id, etc.) instead of just returning the raw reply.

### Fix 3: Strengthen system prompt for BOOKING_SUMMARY

**File: `supabase/functions/widget-ai-chat/index.ts`** (marker instructions area)

Add an even more explicit instruction that the content between `[BOOKING_SUMMARY]` and `[/BOOKING_SUMMARY]` MUST be valid JSON, never human-readable text. Add a negative example showing what NOT to do.

### Fix 4: Fix `lookup_customer` in `noddi-booking-proxy` for 400 errors

**File: `supabase/functions/noddi-booking-proxy/index.ts`** (line ~267-291)

Handle the `user_does_not_exist` 400 response the same way the `widget-ai-chat` `executeLookupCustomer` does — parse the error body and return a structured `{ error: "Customer not found" }` with a 404 status instead of the raw 400, so the client can distinguish between "not found" and actual errors.

## Summary of changes

| File | Change |
|------|--------|
| `supabase/functions/widget-ai-chat/index.ts` | Strengthen BOOKING_SUMMARY prompt; make patchBookingSummary resilient to non-JSON |
| `supabase/functions/noddi-booking-proxy/index.ts` | Handle user_does_not_exist 400 as 404 in lookup_customer |
| `src/widget/components/blocks/BookingSummaryBlock.tsx` | Make parseContent handle non-JSON text |
