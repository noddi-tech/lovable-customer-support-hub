

# Fix: Handle `user_group` as a plain integer

## Root Cause

Line 65-72 builds the `ugIds` array from:
- `carData.user_group_id` — this key doesn't exist on the car response
- `carData.user_group.id` — fails when `user_group` is a plain number like `1234`
- `carData.user_groups[]` — this key doesn't exist on the car response

So `uniqueUgIds` is always empty, the user_group fetch loop never runs, and every plate falls through to "no user/email resolved".

## Fix

In `supabase/functions/bulk-outreach/index.ts`, replace the `ugIds` extraction block (lines 64-72) with logic that handles `user_group` as either a number or an object:

```typescript
const ugIds: number[] = [];

// user_group can be a plain integer ID or an object with .id
const ug = carData?.user_group;
if (typeof ug === "number" && ug > 0) {
  ugIds.push(ug);
} else if (typeof ug === "object" && ug?.id) {
  ugIds.push(ug.id);
}

// Also check these alternate shapes just in case
if (carData?.user_group_id && !ugIds.includes(carData.user_group_id)) {
  ugIds.push(carData.user_group_id);
}
if (Array.isArray(carData?.user_groups)) {
  for (const g of carData.user_groups) {
    const gid = typeof g === "number" ? g : g?.id;
    if (gid && !ugIds.includes(gid)) ugIds.push(gid);
  }
}
```

Also add a diagnostic log right after the car response to show the actual `user_group` value:

```typescript
console.log(`[bulk-outreach] 🚗 Car ${cleanPlate}: user_group=${JSON.stringify(carData?.user_group)}, car_managers=${JSON.stringify(carData?.car_managers?.length)}`);
```

## File Changes

| File | Change |
|---|---|
| `supabase/functions/bulk-outreach/index.ts` | Fix `user_group` extraction to handle plain integer; add diagnostic log |

Then redeploy `bulk-outreach`.

## Expected Result

Once `user_group` is correctly read as a number, the existing fetch at line 79 (`/v1/user-groups/{ugId}/`) will retrieve the group's members with email/phone, and plates will start resolving to real contacts.

