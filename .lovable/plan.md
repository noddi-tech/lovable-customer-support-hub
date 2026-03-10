

## Fix: Delivery Windows 502 — Parameter Name Mismatch + Better Error Handling

### Root Cause

The `delivery_windows` case in `noddi-booking-proxy` has two issues:

1. **MCP parameter name mismatch**: The code passes `selected_sales_item_ids` to the MCP tool, but the Navio MCP docs show `delivery_window_get` expects `sales_item_ids`. The MCP call silently fails, then the REST fallback also fails (likely deprecated endpoint).

2. **No diagnostic logging on MCP response**: When MCP returns an error or unexpected shape, the code silently falls through to REST without logging what MCP actually returned.

### Fix

In `supabase/functions/noddi-booking-proxy/index.ts`, the `delivery_windows` case (lines 157-232):

1. **Rename the MCP argument** from `selected_sales_item_ids` to `sales_item_ids` to match the MCP tool's expected schema.

2. **Add diagnostic logging** for the MCP response body so failures are visible in edge function logs.

3. **Consume the REST response body** on failure to prevent resource leaks and log the actual status + body.

### Changes

**File: `supabase/functions/noddi-booking-proxy/index.ts`**

- Line 170: Change `mcpArgs.selected_sales_item_ids` → `mcpArgs.sales_item_ids`
- Lines 185-211: Add `console.log` for MCP response status and parsed data before the success check
- Lines 224-228: Add more detail to REST fallback error logging

