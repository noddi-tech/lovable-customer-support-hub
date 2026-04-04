

# Two Issues to Fix

## Issue 1: Blank Preview Screen (503 errors)

The blank screen happens when the Lovable preview proxy temporarily loses its connection to the dev server. The dev server itself is running fine (returns HTTP 200 locally). This occurs specifically after Git-based changes sync into the project.

**This is a Lovable platform issue, not a code bug.** The 503 errors in the console (`SuggestionPerformance.tsx`, `tabs.tsx`, `i18n.ts`, etc.) are all source file requests being rejected by the proxy -- not your app code failing.

**Workaround:** Refresh the preview after a Git sync completes. No code change will fix this. If the published URL at `lovable-customer-support-hub.lovable.app` works fine, the app code is correct.

---

## Issue 2: Bulk Outreach -- 0 Matches

**The definitive root cause:** The current code fetches `/v1/user-groups/{ugId}/` (line 93) and reads `ugData.members[0].email`. The Noddi user-groups endpoint does **not** return member contact details in its response -- the `members` array is either absent or empty.

**The proven fix exists in the same codebase.** The `noddi-customer-lookup` function (line 106) successfully uses a different endpoint:
```
/v1/user-groups/{ugId}/bookings-for-customer/?page_size=5
```
This returns bookings with embedded `user` objects containing `email`, `first_name`, `last_name`, and `phone_number`.

### Changes

**File: `supabase/functions/bulk-outreach/index.ts`** (lines 91-112)

Replace the user-group fetch block with the `bookings-for-customer` endpoint:

1. Change the URL from `/v1/user-groups/${ugId}/` to `/v1/user-groups/${ugId}/bookings-for-customer/?page_size=5`
2. Parse the response as `data.results || data` (same as `noddi-customer-lookup`)  
3. Iterate through returned bookings to find the first one with a `user.email`
4. Extract `first_name`, `last_name`, `email`, `phone_number` from the booking's `user` object
5. Keep the existing `ugData.members` fallback as a secondary check

Then redeploy the `bulk-outreach` edge function.

### Expected Result

The user_group ID is correctly extracted (we fixed that in the last change). Now with the correct endpoint, the API will return actual booking data with user contact info, and plates will resolve to real contacts.

