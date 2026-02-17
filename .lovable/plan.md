

# Fix: Pass Selected User Group ID to Booking Summary Re-Lookup

## Problem
When `patchBookingSummary` re-looks up the customer to inject `user_id` and `user_group_id`, it calls `executeLookupCustomer(visitorPhone, visitorEmail)` **without** the selected `user_group_id`. For multi-group users, this returns `needs_group_selection: true` instead of the actual IDs, so `user_group_id` stays as the placeholder string `"<FROM_LOOKUP>"`, causing the Noddi API to reject the booking with a validation error.

## Fix

**File**: `supabase/functions/widget-ai-chat/index.ts`, lines 354-370

Before the re-lookup call, scan `messages` for the `group_selected` action (the JSON payload sent when the user picks a group from the dropdown). Extract the `user_group_id` from it and pass it as the third argument to `executeLookupCustomer`.

```typescript
// Extract selected user_group_id from conversation messages
let selectedGroupId: number | undefined;
for (let i = messages.length - 1; i >= 0; i--) {
  const msg = messages[i];
  if (msg.role === 'user' && typeof msg.content === 'string') {
    try {
      const d = JSON.parse(msg.content);
      if (d.action === 'group_selected' && d.user_group_id) {
        selectedGroupId = d.user_group_id;
        break;
      }
    } catch {}
  }
}

// Pass selectedGroupId so multi-group users get the correct group
const lookupResult = JSON.parse(
  await executeLookupCustomer(visitorPhone, visitorEmail, selectedGroupId)
);
```

This ensures the re-lookup resolves to the correct group and returns `userGroupId` instead of triggering `needs_group_selection` again.

## Technical Details

| File | Lines | Change |
|------|-------|--------|
| `supabase/functions/widget-ai-chat/index.ts` | 354-370 | Extract `user_group_id` from `group_selected` message in conversation history, pass it to `executeLookupCustomer` |

## Expected Results
- Multi-group users who selected a group: booking creation gets the correct `user_group_id` (e.g., 2597) instead of `"<FROM_LOOKUP>"`
- Single-group users: no change in behavior (auto-selected as before)
