

# Fix: AI Ignores Prompt and Calls get_delivery_windows in Loop

## Root Cause

The logs show exactly what happens when "Endre tid" is clicked:

1. Iteration 1: `get_booking_details({"booking_id":1})` -- wrong ID
2. Iteration 2: `lookup_customer({"phone":"+4741354569"})` -- re-fetches
3. Iteration 3: `get_delivery_windows({"address_id":2860, "selected_sales_item_ids":[], "car_ids":[]})` -- **400 error** (empty arrays)
4. Iteration 4: Same call, same 400 error
5. Iteration 5: Same call, 3rd time -- safety break triggers
6. Falls through to fallback "Beklager..."

**The AI ignores all prompt instructions** telling it not to call `get_delivery_windows`. Prompt-only fixes have failed twice. The tool exists in the tool list, so the AI calls it -- and passes empty `selected_sales_item_ids` every time, causing a 400 from Noddi.

## Fix: Code-Level Interception

Instead of relying on the prompt (which clearly doesn't work), intercept the `get_delivery_windows` call in the `executeTool` function and return a synthetic response that tells the AI to emit the [TIME_SLOT] marker.

### File: `supabase/functions/widget-ai-chat/index.ts`

**Change 1: Intercept `get_delivery_windows` in `executeTool`** (around line 1135)

Replace the direct proxy call with validation + interception:

```typescript
case 'get_delivery_windows': {
  // Validate required fields - if missing, redirect AI to use [TIME_SLOT] marker
  if (!args.selected_sales_item_ids || args.selected_sales_item_ids.length === 0) {
    console.warn('[widget-ai-chat] get_delivery_windows called with empty selected_sales_item_ids, redirecting to [TIME_SLOT] marker');
    return JSON.stringify({
      error: 'DO NOT call this tool. Instead, emit the [TIME_SLOT] marker with the address_id, car_ids, license_plate, and sales_item_id from the booking data already in the conversation. The widget component will fetch delivery windows automatically. Example: [TIME_SLOT]{"address_id": ' + (args.address_id || 0) + ', "car_ids": [], "license_plate": "", "sales_item_id": 0}[/TIME_SLOT]'
    });
  }
  return executeBookingProxy({
    action: 'delivery_windows',
    address_id: args.address_id,
    from_date: args.from_date,
    to_date: args.to_date,
    selected_sales_item_ids: args.selected_sales_item_ids
  });
}
```

This way, even if the AI ignores the prompt and calls the tool, it gets a response that:
- Does NOT hit the Noddi API (no 400 error)
- Explicitly tells it to emit [TIME_SLOT] instead
- Includes the address_id it already has

**Change 2: Lower the repeat-tool safety threshold for `get_delivery_windows`** (around line 1475)

Currently the safety break is at 3 calls. For `get_delivery_windows`, break after just 1 failed call since the interception already told the AI what to do:

```typescript
const maxCallsForTool = toolName === 'get_delivery_windows' ? 1 : 3;
if (toolCallCounts[toolName] >= maxCallsForTool) {
  // break
}
```

Wait -- with the interception in Change 1, the AI won't get 400 errors anymore. It will get the redirect message on the first call. But to be safe, still lower the threshold to 2 for this specific tool.

### Deploy

Re-deploy `widget-ai-chat` edge function.

## Expected Result

When user clicks "Endre tid":
1. AI tries to call `get_delivery_windows` with empty arrays
2. Code intercepts it, returns "use [TIME_SLOT] marker instead"
3. AI emits the [TIME_SLOT] marker on the next iteration
4. Widget renders the time slot picker -- no fallback error

