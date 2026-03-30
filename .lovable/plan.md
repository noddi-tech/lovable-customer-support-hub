

## Display Membership Programs & Coupons from Customer Lookup

### What's new
The Noddi `customer-lookup-support` API now returns `membership_programs` and `coupons` arrays on each user group. We need to pass these through the edge function and display them in the support UI.

### Plan

| # | File | Change |
|---|------|--------|
| 1 | `supabase/functions/noddi-customer-lookup/index.ts` | Pass through `membership_programs` and `coupons` in both `allUserGroupsFormatted` blocks (lines ~1528-1540 for live, ~1300-1313 for legacy fallback). Also add to the top-level `data` response for the selected group |
| 2 | `src/hooks/useNoddihKundeData.ts` | Add `membership_programs` and `coupons` to the `NoddiLookupResponse` type under `data` and/or `all_user_groups` |
| 3 | `src/components/dashboard/voice/NoddiCustomerDetails.tsx` | Add two new UI sections after booking data: **Membership Programs** (badge-style list showing program name/status) and **Coupons** (compact list with code, description, expiry/status) |
| 4 | `src/components/mobile/conversations/MobileCustomerSummaryCard.tsx` | Add membership/coupon indicators to the mobile card view |

### Edge function changes
In both the live path (line ~1528) and legacy fallback (line ~1300), add to the user group mapping:
```ts
membership_programs: g.membership_programs || [],
coupons: g.coupons || [],
```

Also add selected group's programs/coupons to the top-level response `data`:
```ts
membership_programs: selectedGroup.membership_programs || [],
coupons: selectedGroup.coupons || [],
```

### UI display
- **Membership Programs**: Section with `Crown` icon header, each program as a badge showing name and status
- **Coupons**: Section with `Ticket` icon header, each coupon showing code, description, and validity/status in a compact card format
- Both sections only render when the arrays have items
- Integrated into the `displayedData` memo so they update when switching user groups

### Version bump
Update version string from `noddi-edge-1.7` to `noddi-edge-1.8`

