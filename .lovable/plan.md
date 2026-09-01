# Push customers to Aircall as contacts

Yes — Aircall has a public Contacts API, so we can keep an Aircall address book in sync with our customers. Incoming calls from a known number then show the customer's name in the Aircall phone and in call notifications.

## What exists today

- Aircall API credentials (API ID + token) are already stored per organization in the voice integration settings, and there is an edge function that calls `api.aircall.io/v1/company` with Basic Auth to validate them.
- The `customers` table holds 4,348 rows; 573 have both a phone number and a full name. Those 573 are the initial sync candidates.
- No contact-push code exists yet — only credential testing and the Everywhere workspace embed.

## Proposed behaviour

1. **New edge function `aircall-sync-contacts`** (per organization):
   - Reads Aircall credentials from `voice_integrations.configuration.aircallEverywhere`.
   - Selects customers with a non-empty phone and name, normalized to E.164 (Norwegian default `+47` when a bare 8-digit number is stored).
   - For each customer: look up the Aircall contact by phone (`GET /v1/contacts/search?phone_number=`), then `POST /v1/contacts` to create or `PUT /v1/contacts/:id` to update name/email.
   - Respects Aircall's rate limit (60 requests/minute) with batching and pacing; resumes from where it stopped so a large sync spans multiple runs.
   - Returns a summary: created / updated / skipped / failed.

2. **Sync state tracking**: store `aircall_contact_id` and `aircall_synced_at` on each customer (in `customers.metadata`, no schema change needed) so repeat runs only push new or changed records.

3. **Admin UI** in the existing Aircall settings page:
   - Toggle "Sync customers to Aircall contacts".
   - "Sync now" button showing counts (eligible customers, synced, last run) and the result summary.

4. **Keep it fresh**: after the initial backfill, push a single contact whenever a customer's name or phone is created/changed, plus a nightly cron catch-up for anything missed.

## Trade-offs to be aware of

- Aircall contacts are company-wide, not per-agent — every Aircall user in the workspace will see these names.
- Only customers with both a name and a phone are pushed (573 today); the rest stay unnamed until we learn a name.
- Aircall rate limits at 60 calls/minute, so a full 573-customer backfill takes roughly 20 minutes of paced background work (two API calls per customer).
- Deleting a customer here will not remove the Aircall contact unless we add a delete path — proposed as a follow-up, not in this first pass.

## Technical notes

- Files: new `supabase/functions/aircall-sync-contacts/index.ts` (registered in `supabase/config.toml`), new shared phone-normalization helper reusing `src/utils/phoneNumberUtils.ts` logic on the Deno side, edits to `src/components/admin/AircallSettings.tsx` for the toggle/button, and a new hook for invoking the sync.
- Auth: function validates the caller's JWT and admin role, then uses the service role client to read customers scoped to the caller's organization.
- Idempotency: search-by-phone before create avoids duplicate Aircall contacts if state is lost.
- Cron scheduling via `pg_cron` invoking the function nightly, matching the existing scheduled-function pattern in the project.
