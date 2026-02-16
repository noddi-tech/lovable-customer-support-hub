

# Fix: Service Display, Missing Bookings, and User Group Selection

## Root Cause Analysis

### Issue 1: "Tjeneste: Delivery" instead of all services
**Location**: `patchBookingInfo` in `supabase/functions/widget-ai-chat/index.ts`, line 620-621

The code only extracts the **first** service name from the `services` array:
```typescript
const svcName = typeof svcSource[0] === 'string' ? svcSource[0] : (svcSource[0].service_name || svcSource[0].name || '');
if (svcName) info.service = svcName;
```

If the Noddi API returns `["Delivery", "Dekkskift"]`, only "Delivery" is shown. The fix is to join **all** service names.

### Issue 2: Only 1 booking found (should show carousel of all confirmed bookings)
**Location**: `executeLookupCustomer`, lines 1180-1230

The `customer-lookup-support` endpoint only exposes `priority_booking` (1 booking per group) and sometimes `upcoming_bookings` in the `bookings_summary`. For this user, only 1 booking came through (`priority_booking`). 

The `bookings-for-customer` fallback at line 1210 is guarded by an "incomplete data" condition:
```typescript
if (bookings.some(b => !b.start_time && !b.delivery_window_starts_at ...))
```

Since the single priority booking has complete data, this condition is **false**, and the fallback **never fires**. The other confirmed bookings are never fetched.

**Fix**: Always call `bookings-for-customer` to get the complete list of bookings, not just as a fallback for missing data.

### Issue 3: No user group selection prompt
**Location**: `executeLookupCustomer`, lines 1171-1173

When a user belongs to multiple user groups (e.g., "Joachim Rathke" personal + "Lomundal Oslo AS"), the code silently auto-selects the default/personal group:
```typescript
const userGroupId = userGroups.find(g => g.is_default_user_group)?.id
  || userGroups.find(g => g.is_personal)?.id
  || userGroups[0]?.id;
```

No prompt is shown to the user. **Fix**: When multiple user groups exist, return the list of groups to the AI so it can present a selection (using ACTION_MENU or similar), and only proceed with bookings after the user picks a group.

---

## Changes

### 1. Fix service display to show ALL services (not just first)

**File**: `supabase/functions/widget-ai-chat/index.ts`, lines 618-622

Replace:
```typescript
const svcSource = bookingData.services || bookingData.order_lines || bookingData.items || bookingData.sales_items || [];
if (Array.isArray(svcSource) && svcSource.length > 0) {
  const svcName = typeof svcSource[0] === 'string' ? svcSource[0] : (svcSource[0].service_name || svcSource[0].name || '');
  if (svcName) info.service = svcName;
}
```

With:
```typescript
const svcSource = bookingData.services || bookingData.order_lines || bookingData.items || bookingData.sales_items || [];
if (Array.isArray(svcSource) && svcSource.length > 0) {
  const allNames = svcSource
    .map((s: any) => typeof s === 'string' ? s : (s.service_name || s.name || ''))
    .filter(Boolean);
  if (allNames.length > 0) info.service = allNames.join(', ');
}
```

This ensures "Delivery, Dekkskift" is shown instead of just "Delivery".

### 2. Always fetch bookings-for-customer (not just as incomplete-data fallback)

**File**: `supabase/functions/widget-ai-chat/index.ts`, lines 1209-1230

Remove the "incomplete data" guard condition. Always call `bookings-for-customer` when `userGroupId` is available to get the full list of bookings:

```typescript
// 3. ALWAYS fetch full booking list from bookings-for-customer
// (customer-lookup-support only returns priority_booking, not all bookings)
if (userGroupId) {
  try {
    const bfcResp = await fetch(
      `${API_BASE}/v1/user-groups/${userGroupId}/bookings-for-customer/?page_size=20`,
      { headers: { 'Authorization': `Token ${noddiToken}`, 'Accept': 'application/json' } }
    );
    if (bfcResp.ok) {
      const bfcData = await bfcResp.json();
      const results = Array.isArray(bfcData) ? bfcData : (bfcData.results || []);
      for (const fb of results) {
        if (fb?.id && seenBookingIds.has(fb.id)) {
          // Replace with richer data from this endpoint
          const idx = bookings.findIndex((b: any) => b.id === fb.id);
          if (idx >= 0) bookings[idx] = fb;
        } else if (fb?.id && !seenBookingIds.has(fb.id)) {
          bookings.push(fb);
          seenBookingIds.add(fb.id);
        }
      }
      console.log(`[lookup] Full bookings from bookings-for-customer: ${results.length} results`);
    }
  } catch (e) {
    console.error('[lookup] bookings-for-customer failed:', e);
  }
}
```

This ensures ALL confirmed bookings appear in the carousel, not just the single priority booking.

### 3. Return user group choices when multiple groups exist

**File**: `supabase/functions/widget-ai-chat/index.ts`, lines 1170-1173

When there are 2+ user groups, return a response that tells the AI to ask the user which group they want, instead of auto-selecting:

```typescript
// If multiple user groups, ask the user to choose
if (userGroups.length > 1) {
  const groupOptions = userGroups.map((g: any) => ({
    id: g.id,
    name: g.name || `Gruppe ${g.id}`,
    is_personal: g.is_personal || false,
    is_default: g.is_default_user_group || false,
    total_bookings: g.bookings_summary?.total_bookings || 0,
  }));
  
  return JSON.stringify({
    found: true,
    needs_group_selection: true,
    customer: {
      name: `${noddihUser.first_name || ''} ${noddihUser.last_name || ''}`.trim() || noddihUser.name || '',
      email: noddihUser.email,
      phone: noddihUser.phone,
      userId: noddihUser.id,
    },
    user_groups: groupOptions,
    message: `Kunden er medlem av ${groupOptions.length} grupper. Be kunden velge hvilken gruppe det gjelder.`,
  });
}

// Single group - continue as normal
const userGroupId = userGroups[0]?.id;
```

Then update the AI system prompt (or post-processor) to detect `needs_group_selection` and render an `[ACTION_MENU]` with the group names as options. When the user selects a group, the AI should call `lookup_customer` again with an additional `user_group_id` parameter.

**Also update `executeLookupCustomer` signature** to accept an optional `userGroupId` parameter. When provided, skip the selection logic and use the specified group directly:

```typescript
async function executeLookupCustomer(phone?: string, email?: string, userGroupId?: number): Promise<string> {
  // ... existing lookup code ...
  
  // If userGroupId specified (from group selection), use it directly
  const selectedGroupId = userGroupId 
    || (userGroups.length === 1 ? userGroups[0]?.id : null);
    
  if (!selectedGroupId && userGroups.length > 1) {
    // Return group selection prompt (code from above)
  }
  
  // Continue with selectedGroupId...
}
```

**Update the tool definition** for `lookup_customer` to include an optional `user_group_id` parameter so the AI can pass it after the user selects a group.

---

## Summary of File Changes

| File | Change |
|------|--------|
| `supabase/functions/widget-ai-chat/index.ts` | 1) Join all service names in `patchBookingInfo` instead of taking only the first 2) Always call `bookings-for-customer` endpoint (remove incomplete-data guard) 3) Add user group selection flow when multiple groups exist 4) Add `user_group_id` parameter to `lookup_customer` tool definition |

## Expected Results
1. Service field shows "Delivery, Dekkskift" (all services joined)
2. Carousel shows ALL confirmed future bookings from the user group
3. User is prompted to choose their user group before bookings are displayed
