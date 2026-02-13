

# Fix: Customer Lookup Crash Due to Non-String `status` Field

## Problem

The booking status filter we just added is crashing the entire customer lookup:

```
TypeError: (b.status || "").toLowerCase is not a function
```

The Noddi API returns `status` as an **object** (e.g., `{"id": 1, "name": "confirmed"}`) rather than a plain string. Calling `.toLowerCase()` on an object throws, causing `executeLookupCustomer` to return an error. This is why the AI responds with "Det ser ut til at det oppstod et problem med å finne kontoen din" -- the lookup never completes.

## Fix (1 file)

**File: `supabase/functions/widget-ai-chat/index.ts`** (line ~584-586)

Update the status filter to handle both string and object formats:

```typescript
.filter((b: any) => {
  const rawStatus = b.status;
  const status = (
    typeof rawStatus === 'string' ? rawStatus
    : typeof rawStatus === 'object' && rawStatus !== null ? (rawStatus.name || rawStatus.slug || String(rawStatus.id || ''))
    : ''
  ).toLowerCase();
  return !['completed', 'cancelled', 'canceled', 'no_show', 'expired'].includes(status);
})
```

This safely extracts the status string whether the API returns `"confirmed"` or `{"id": 1, "name": "confirmed"}`.

## Scope

| File | Change |
|------|--------|
| `supabase/functions/widget-ai-chat/index.ts` | Fix status filter to handle object-type status fields |

