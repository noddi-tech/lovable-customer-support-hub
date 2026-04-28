## Goal

Store the freshly-derived Page Access Token for the Noddi Facebook page (`105802555071303`) on integration row `22455007-ce79-4872-b0d2-998212d4dcb2` so the `meta-lead-webhook` edge function can call the Graph API to fetch lead details.

## Verified before persisting

- Step 1 (derive): returned `access_token` with `id = 105802555071303` (page-scoped).
- Step 2 (`/me`): returned `{"name":"Noddi","id":"105802555071303"}` — confirmed page token.
- Step 3 (`subscribed_apps`): returned `{"success": true}` — page is now subscribed to `leadgen`.

## Change

Single data update via the insert tool (no schema change):

```sql
UPDATE recruitment_meta_integrations
SET page_access_token = 'EAGDq4CJmt2ABRWurUx4yiKAZBPYthBzNiLskJHatd4AIpbXPE8PInx77P2wmgxPupwIG9qYS8tJ0M3RmUsxE5hXJACh5PmEGkPKLx4DDZAZBUITXN9UnjZBt1AagCSxAnv5VdZA8qMXZAmo3H0V5sG5VKfJI0kSsTWJ4supMpJ9Ofngc9yPIaCpGqhG7vNQqHZA5P0ZD',
    updated_at = now()
WHERE id = '22455007-ce79-4872-b0d2-998212d4dcb2';
```

Expected: 1 row updated.

## After approval

I'll run the UPDATE and report the row count back. No code changes required — the webhook handler already reads `page_access_token` from this row.
