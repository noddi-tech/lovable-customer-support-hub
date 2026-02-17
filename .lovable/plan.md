

# Fix: Status Filter Missing `value` Field From Noddi API

## Problem
The Noddi API returns booking status as `{label: "Cancelled", value: 3}` using the **`value`** field for the numeric code. The current filter only checks `rawStatus.id`, never `rawStatus.value`. When `id` is undefined, `STATUS_MAP[undefined]` returns nothing, and cancelled bookings slip through.

This affects ALL flows -- new booking, change booking, cancel booking -- any time bookings are fetched and filtered.

## Fix

**File**: `supabase/functions/widget-ai-chat/index.ts`

Two lines need the same change -- add `rawStatus.value` as a fallback alongside `rawStatus.id`:

**Line 1410** (filter):
```
// Before:
rawStatus.name || rawStatus.slug || STATUS_MAP[rawStatus.id] || String(rawStatus.id || '')

// After:
rawStatus.name || rawStatus.slug || STATUS_MAP[rawStatus.id ?? rawStatus.value] || rawStatus.label || String(rawStatus.id ?? rawStatus.value ?? '')
```

**Line 1427** (display mapping):
```
// Before:
rawSt.name || rawSt.slug || STATUS_MAP[rawSt.id] || ''

// After:
rawSt.name || rawSt.slug || STATUS_MAP[rawSt.id ?? rawSt.value] || rawSt.label || ''
```

Adding `rawStatus.label` as another fallback also handles cases where the API sends `{label: "Cancelled"}` without a numeric code.

## Why This Fixes It
- `{value: 3}` -> `STATUS_MAP[3]` -> `"cancelled"` -> filtered out
- `{id: 3}` -> `STATUS_MAP[3]` -> `"cancelled"` -> filtered out (still works)
- `{label: "Cancelled"}` -> `"Cancelled"` -> `.toLowerCase()` -> `"cancelled"` -> filtered out
- `{name: "cancelled"}` -> `"cancelled"` -> filtered out (still works)

All status shapes are now covered across every booking flow.

