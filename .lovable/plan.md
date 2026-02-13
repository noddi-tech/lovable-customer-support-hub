

# Fix: Delivery Windows 400 Error — Empty `selected_sales_item_ids`

## Problem

The Noddi API returns a **400 validation error**: `"This list may not be empty."` for `selected_sales_item_ids`. The `noddi-booking-proxy` edge function passes through an empty array `[]` because `if (selected_sales_item_ids)` evaluates to `true` for empty arrays in JavaScript.

## Root Cause

In `supabase/functions/noddi-booking-proxy/index.ts` line 166:

```typescript
if (selected_sales_item_ids) {  // [] is truthy!
```

An empty array `[]` passes this check, causing the proxy to append `selected_sales_item_ids=` query params with no valid values to the Noddi API URL.

## Fix

**File: `supabase/functions/noddi-booking-proxy/index.ts`** (line 166)

Change the guard to also check array length:

```typescript
if (selected_sales_item_ids && Array.isArray(selected_sales_item_ids) 
    ? selected_sales_item_ids.length > 0 
    : selected_sales_item_ids) {
```

This ensures empty arrays are treated the same as `undefined`/`null`, and the Noddi API is called without the parameter (which is valid and returns all available windows).

## Single Change

| File | Line | Change |
|------|------|--------|
| `supabase/functions/noddi-booking-proxy/index.ts` | 166 | Guard against empty `selected_sales_item_ids` arrays |

