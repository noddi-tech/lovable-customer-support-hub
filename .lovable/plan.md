

## Fix: MCP customer_lookup Missing Stored Addresses & Cars

### Problem

Two issues visible in the screenshots:

1. **Addresses listed as plain text bullets** instead of the interactive `[ADDRESS_SEARCH]` component with clickable pills
2. **Cars not shown at all** — the AI doesn't offer the `[LICENSE_PLATE]` component with stored cars

### Root Cause

When the MCP `customer_lookup` tool succeeds (line 2191-2197 in `widget-ai-chat/index.ts`), the raw MCP result is returned directly to the AI. The MCP response likely does NOT include `stored_addresses` and `stored_cars` in the format the AI expects, because only the legacy `executeLookupCustomer` function extracts and formats these from booking history.

Without `stored_addresses`/`stored_cars` in the tool result, the AI:
- Lists addresses as plain text bullets (no data to pass to `[ADDRESS_SEARCH]{"stored": [...]}`)
- Skips car selection entirely (no `stored_cars` data to pass to `[LICENSE_PLATE]{"stored": [...]}`)

### Fix

After the MCP `customer_lookup` call succeeds, **enrich the result** with `stored_addresses` and `stored_cars` extracted from the MCP response's booking data. This mirrors what the legacy function does.

**File: `supabase/functions/widget-ai-chat/index.ts`** (lines 2188-2202)

In the `lookup_customer` case, after getting `mcpResult`:

1. Parse the MCP result and check if it already has `stored_addresses`/`stored_cars`
2. If missing, extract them from the booking data in the MCP response (same extraction logic as the legacy function: scan `booking_items_car`, `cars`, `car`, addresses from bookings and user groups)
3. Also call the legacy `executeLookupCustomer` as a supplementary data source if the MCP result lacks booking detail, and merge `stored_addresses`/`stored_cars` into the MCP result
4. Return the enriched result to the AI

The simplest reliable approach: **always run the legacy `executeLookupCustomer` alongside MCP, and merge `stored_addresses` and `stored_cars` from the legacy result into the MCP result** if the MCP result is missing them. This ensures the AI always gets the extracted address/car data regardless of MCP response format.

```typescript
case 'lookup_customer': {
  let result: any = null;
  
  // Try MCP first
  if (mcpAuthToken) {
    try {
      const mcpArgs: any = { auth_token: mcpAuthToken };
      if (args.user_group_id) mcpArgs.user_group_id = args.user_group_id;
      const mcpResult = await callMcpTool('customer_lookup', mcpArgs);
      result = typeof mcpResult === 'string' ? JSON.parse(mcpResult) : mcpResult;
    } catch (err) {
      console.warn('[executeTool] MCP customer_lookup failed:', (err as Error).message);
    }
  }
  
  // Always run legacy lookup to get stored_addresses/stored_cars
  const legacyResultStr = await executeLookupCustomer(
    args.phone || visitorPhone, args.email || visitorEmail, args.user_group_id
  );
  const legacyResult = JSON.parse(legacyResultStr);
  
  if (!result) {
    // MCP failed, use legacy entirely
    return legacyResultStr;
  }
  
  // Merge stored data from legacy into MCP result
  if (!result.stored_addresses && legacyResult.stored_addresses) {
    result.stored_addresses = legacyResult.stored_addresses;
  }
  if (!result.stored_cars && legacyResult.stored_cars) {
    result.stored_cars = legacyResult.stored_cars;
  }
  
  return JSON.stringify(result);
}
```

### Files Changed

| File | Change |
|---|---|
| `supabase/functions/widget-ai-chat/index.ts` | Enrich MCP customer_lookup result with `stored_addresses` and `stored_cars` from legacy lookup |

