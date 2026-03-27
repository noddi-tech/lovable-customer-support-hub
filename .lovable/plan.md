

## Fix: Disable Quoted Content Expansion Creating Fake Duplicates

### Root Cause

`ENABLE_QUOTED_EXTRACTION` is set to `true` in `src/lib/parseQuotedEmail.ts` (line 83). This causes `expandQuotedMessagesToCards` to create synthetic message cards from quoted email content (e.g., when a customer's reply includes the previous agent message via Outlook's "Fra:/Sendt:/Til:/Emne:" quoting). These synthetic cards appear as separate "Customer" messages, looking exactly like duplicates.

The database has only 7 real messages for this conversation — zero are forwarding echoes. All the "duplicates" are fabricated by the UI.

### Fix

**Single line change** in `src/lib/parseQuotedEmail.ts`:

```ts
// Line 83: Change from true to false
export const ENABLE_QUOTED_EXTRACTION = false;
```

This stops the system from expanding quoted email blocks into separate cards. The quoted content will still be accessible via the existing "Show quoted text" toggle on each message card.

### Why this is safe
- The quoted content is already viewable through the expand/collapse toggle on each card
- The echo filter and dedup logic remain intact for real duplicates
- No database changes needed
- No other files need changes

### Files
| # | File | Change |
|---|------|--------|
| 1 | `src/lib/parseQuotedEmail.ts` | Set `ENABLE_QUOTED_EXTRACTION = false` |

