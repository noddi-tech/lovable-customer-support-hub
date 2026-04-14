

# Fix: Swap endpoint order + capture cache freshness header

## What happened
Anders confirmed the new `user-customer-lookup-summary` endpoint is **not deployed yet** (stuck in CI). So every lookup currently hits the new endpoint first, gets a 404, then falls back to the old one -- adding latency and noise. He also shared that when the new endpoint is live, it will return a `X-Navio-Cached-At` response header with the cache timestamp.

## Changes

### 1. Swap endpoint order (primary fix)
**File: `supabase/functions/noddi-customer-lookup/index.ts`** (line ~887-890)

Flip the array so the old (working) endpoint is tried first:
```typescript
const ENDPOINTS = [
  { url: `${API_BASE}/v1/users/customer-lookup-support/`, label: 'legacy (support)' },
  { url: `${API_BASE}/v1/users/user-customer-lookup-summary/`, label: 'new (summary)' },
];
```

This way lookups work immediately. When Anders deploys the new endpoint, the fallback will start being used -- we can swap back later.

### 2. Capture `X-Navio-Cached-At` header
When a successful response comes back, read the `X-Navio-Cached-At` header and include it in `ui_meta` as `cached_at`. This lets the UI show cache freshness (e.g., "Data from 2 min ago").

### 3. Show cache freshness in UI
**File: `src/components/dashboard/voice/NoddiCustomerDetails.tsx`**

Next to the refresh button, show a subtle timestamp like "Cached 3m ago" when `ui_meta.cached_at` is present.

### 4. Update types
**File: `src/hooks/useNoddihKundeData.ts`**

Add `cached_at?: string` to `ui_meta` in the response type.

### Files to modify
- `supabase/functions/noddi-customer-lookup/index.ts` -- swap endpoint order, capture `X-Navio-Cached-At`
- `src/components/dashboard/voice/NoddiCustomerDetails.tsx` -- show cache freshness
- `src/hooks/useNoddihKundeData.ts` -- add `cached_at` to type

