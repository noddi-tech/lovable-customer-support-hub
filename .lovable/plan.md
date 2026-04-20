
## Addition: Category → Bucket mapping UI

User wants to override the default category-to-bucket mapping (e.g. move `billing_issue` from Ops → Tech). So the bucket assignment isn't hardcoded — it's data, and admins see + edit it.

### Schema delta (one extra column)

Add to `slack_integrations` (org-level):
```
critical_category_routing  jsonb  default '{}'::jsonb
```
Shape:
```json
{
  "service_failure":     "tech",
  "data_issue":          "tech",
  "billing_issue":       "ops",
  "safety_concern":      "ops",
  "frustrated_customer": "ops",
  "escalation_request":  "ops",
  "legal_threat":        "ops"
}
```
Empty/missing keys fall back to a hardcoded `DEFAULT_CATEGORY_BUCKETS` constant in `_shared/critical-routing.ts` — so existing orgs don't break and new categories added later have safe defaults.

No per-inbox override for the mapping itself — that'd be too granular. Per-inbox override stays at the *bucket → channel/mention* level (already in plan). Mapping is org-wide.

### UI: third card under the Tech/Ops cards

```
┌─ Categories → Bucket ─────────────────────────────────────┐
│  Decide which alerts go to which team.                    │
│                                                           │
│  Service failure         [ Tech ▾ ]   "appen krasjer"     │
│  Data issue              [ Tech ▾ ]   "feil data vist"    │
│  Billing issue           [ Ops  ▾ ]   "feil belastet"     │
│  Safety concern          [ Ops  ▾ ]   "skadet bil"        │
│  Frustrated customer     [ Ops  ▾ ]   "elendig service"   │
│  Escalation request      [ Ops  ▾ ]   "snakke med leder"  │
│  Legal threat            [ Ops  ▾ ]   "advokat"           │
│                                                           │
│  Tip: move 'billing_issue' to Tech if your billing system │
│  failures are usually code-related, not customer-disputes.│
└───────────────────────────────────────────────────────────┘
```

Each row = category name (Norwegian label) + 2-option dropdown (Tech / Ops) + small example trigger text pulled from the existing keyword constants in `smart-critical-triage` so admins see *what kind of message* would trigger this category. No "Disabled" option — disabling categories is upstream in the AI triage settings, not here.

### Edge function lookup

In `_shared/critical-routing.ts`:
```ts
function resolveBucket(category, integration) {
  const override = integration.critical_category_routing?.[category];
  return override ?? DEFAULT_CATEGORY_BUCKETS[category] ?? 'ops';
}
```
Final fallback to `'ops'` so any unmapped/new category lands somewhere visible.

### Audit trail

Already covered by the existing audit triggers on `slack_integrations` — every mapping change will log `change_type='UPDATE'` with old/new `critical_category_routing` JSON, so we can answer "who moved billing_issue to Tech and when".

### Verification additions

- **7.** Move `billing_issue` Ops → Tech, save, send test alert containing "feil belastet" → routed to Tech subteam, "Routed to: Tech (billing_issue)" context block confirms.
- **8.** Reset mapping to defaults button restores `DEFAULT_CATEGORY_BUCKETS`.
- **9.** Audit log shows the override change with before/after JSON.

### Files (delta from previous plan)

- migration: add `critical_category_routing jsonb` to `slack_integrations`
- `_shared/critical-routing.ts`: export `DEFAULT_CATEGORY_BUCKETS` + `resolveBucket()`
- `SlackIntegrationSettings.tsx`: add the third "Categories → Bucket" card with 7 rows + save mutation + reset-to-defaults button
- `useSlackIntegration.ts`: add `critical_category_routing` to type + update mutation

Everything else from the prior plan is unchanged.
