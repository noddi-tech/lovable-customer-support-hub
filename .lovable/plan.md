# Fix lead_retrieval probe to mirror runtime behavior

The current health probe hits `/{form_id}/leads` (list endpoint), which requires `pages_manage_ads` — a scope page tokens often lack. Runtime ingestion only ever fetches individual leads by ID, which works with `leads_retrieval`. Switch the probe to match.

## Changes

### 1. `supabase/functions/meta-integration-health-check/index.ts`

**Replace the form-mappings query (lines 207–212)** with a lookup of the most recent successfully-ingested lead:

```ts
const { data: recentLeads } = await admin
  .from('recruitment_lead_ingestion_log')
  .select('external_id, created_at')
  .eq('integration_id', integrationId)
  .eq('status', 'success')
  .not('external_id', 'is', null)
  .order('created_at', { ascending: false })
  .limit(1);
const recentLead = recentLeads?.[0];
```

**Replace the lead_retrieval probe block (lines 213–229)** with a lead-by-id fetch:

```ts
let lead_retrieval = {
  can_fetch_forms: false,
  last_success_at: null as string | null,
  last_error: null as string | null,
  tested_lead_id: recentLead?.external_id ?? null,
};
if (recentLead?.external_id) {
  const r = await fetchJson(
    `${GRAPH}/${recentLead.external_id}?fields=id,created_time,form_id&access_token=${encodeURIComponent(TOKEN)}`
  );
  lead_retrieval.can_fetch_forms = r.ok;
  lead_retrieval.last_success_at = r.ok ? new Date().toISOString() : null;
  lead_retrieval.last_error = r.ok ? null : (r.error ?? `HTTP ${r.status}`);
} else {
  lead_retrieval.last_error = 'Ingen tidligere mottatte leads å teste mot ennå';
  lead_retrieval.can_fetch_forms = true; // not tested != broken
}
```

**Update the `HealthResult` interface (line 40)**: rename `tested_form_id?: string | null` → `tested_lead_id?: string | null`.

**Update the no-token early-return block (line 130)**: the `lead_retrieval` literal there also needs to satisfy the new shape (add `tested_lead_id: null`).

### 2. `src/components/dashboard/recruitment/admin/integrations/types.ts`

In `MetaHealthCheckResult.lead_retrieval`, rename `tested_form_id?: string | null` → `tested_lead_id?: string | null`.

### 3. `src/components/dashboard/recruitment/admin/integrations/MetaHealthTab.tsx`

In the "Lead-henting" section:
- Success label: `"Sist mottatte lead kunne hentes på nytt"` (replaces `"Kan hente leads fra Meta"`).
- Failure label: keep `"Klarte ikke hente leads fra Meta"`.
- When `lead_retrieval.last_error` equals the no-leads sentinel, show: `"Ingen tidligere mottatte leads å teste mot — venter på første lead via webhook"` instead of the raw error string, and treat the row as neutral (use the `warn` style rather than red).

### 4. Deploy + verify

- Redeploy `meta-integration-health-check`.
- Run health check from Helse tab against integration `22455007-ce79-4872-b0d2-998212d4dcb2`.
- Confirm response: `overall_status: "healthy"`, `lead_retrieval.can_fetch_forms: true`, `lead_retrieval.tested_lead_id` matches Erdal's `external_id` (`964413816123015`).
- Paste the JSON response back for verification.

## Files touched

- `supabase/functions/meta-integration-health-check/index.ts`
- `src/components/dashboard/recruitment/admin/integrations/types.ts`
- `src/components/dashboard/recruitment/admin/integrations/MetaHealthTab.tsx`

`meta-integration-test-token` is unchanged — it doesn't probe lead retrieval.
