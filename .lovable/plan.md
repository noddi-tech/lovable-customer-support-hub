
Goal

Fix the mismatch where the lookup toast says matches were found, but the Review step still shows every row as “Not found”.

Do I know what the issue is? Yes.

What is actually broken

- The current screenshots point to a frontend state bug, not primarily an API lookup bug.
- In `src/pages/BulkOutreach.tsx`, both `handlePlateLookup` and `handleFetchBookings` only append brand-new plates:
  - they build `existingPlates`
  - then filter out any incoming result whose plate already exists
- That means if a plate was previously loaded as unmatched, a later successful re-lookup for the same plate is ignored.
- Result:
  - toast uses the fresh edge-function response and says “found 10 matches”
  - Review step uses stale `recipients` state and still shows the old unmatched rows
- Secondary UI bug: in `src/components/bulk-outreach/RecipientReview.tsx`, `allSelected` becomes `true` when there are zero matched rows because `.every()` on an empty array returns `true`.

Plan

1. Replace append-only merging with upsert-by-plate
   - In `src/pages/BulkOutreach.tsx`, create one shared merge helper that updates existing recipients by `plate` instead of skipping them.
   - Overwrite `name`, `email`, `phone`, `matched`, `reason`, and `source` with the newest lookup result.
   - Recompute `selected` so newly matched rows become selected, while unmatched rows are unselected.

2. Use the same merge logic for both lookup flows
   - Apply the helper in:
     - `handlePlateLookup`
     - `handleFetchBookings`
   - This prevents stale data whether users search by plate or by route/date.

3. Fix the Review-step selection summary
   - In `src/components/bulk-outreach/RecipientReview.tsx`, change `allSelected` to only be true when `matchedCount > 0` and every matched row is selected.
   - Use `plate` as the table row key instead of the array index so row updates render reliably.

4. Improve the copy so it matches reality
   - Change “11 customers loaded” to wording that does not imply all were resolved, e.g. “11 plates loaded”.
   - Optionally show both total and matched counts before the user clicks Next.

5. Verify the stale-state scenario
   - Re-run the same 11 plates that previously showed `Not found`.
   - Expected:
     - toast count and Review count match
     - updated rows now show names/emails
     - only truly unresolved plates remain `Not found`

Files to update

- `src/pages/BulkOutreach.tsx`
- `src/components/bulk-outreach/RecipientReview.tsx`

Technical detail

```text
Current:
edge function returns fresh matches
toast reads fresh response
state merge drops duplicate plates
review table reads old recipient objects

Fixed:
edge function returns fresh matches
client upserts rows by plate
review table reads updated recipient objects
toast + review stay in sync
```
