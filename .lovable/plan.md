

# Fix: patchBookingSummary cannot find customer IDs (they're from a previous request)

## Root Cause

The `patchBookingSummary` function searches `currentMessages` for `lookup_customer` tool results. However, the tool call happened in a **previous HTTP request cycle** (during phone verification). The frontend only sends user/assistant text messages in subsequent requests -- tool call results are never forwarded back.

This means `patchBookingSummary` will **never** find the `customer.userId` and `customer.userGroupId` in the messages array.

## Solution

Instead of searching message history, use the already-available `visitorPhone` to re-lookup the customer when a BOOKING_SUMMARY with missing IDs is detected. This is a lightweight call to the same Noddi API endpoint.

## Technical Details

### File: `supabase/functions/widget-ai-chat/index.ts`

1. **Make `patchBookingSummary` async** and accept `visitorPhone`/`visitorEmail` as parameters
2. When `user_id` or `user_group_id` are missing, call `executeLookupCustomer(visitorPhone, visitorEmail)` to get the IDs
3. Remove the message-scanning logic for customer IDs (it can never work)
4. Keep the delivery_window_id extraction from user messages (this CAN work since time slot selection is in the current request's messages)

```text
Before: patchBookingSummary(reply, currentMessages)  -- sync, searches messages
After:  patchBookingSummary(reply, currentMessages, visitorPhone, visitorEmail)  -- async, re-lookups customer
```

### Call site change (around line 1454):

```typescript
const reply = await patchBookingSummary(rawReply, currentMessages, visitorPhone, visitorEmail);
```

### Deployment
- Redeploy `widget-ai-chat`
