
# Fix: Booking Confirmation Fails Due to Placeholder User IDs

## Problem

The AI model emits placeholder values like `user_id: 12345` and `user_group_id: 67890` in the `[BOOKING_SUMMARY]` JSON. These look like valid numbers, so the `patchBookingSummary` function's check (`!summaryData.user_id`) passes — it thinks the IDs are real and skips the customer re-lookup. The Noddi API then rejects them with "CustomUser with pk=12345 not found."

## Root Cause

Two issues working together:
1. The system prompt example includes realistic-looking fake IDs (`user_id: 48372`) which the AI copies
2. `patchBookingSummary` only re-looks up the customer when `user_id` is falsy (0, null, undefined) — it trusts any truthy number

## Solution

### Change 1: Always re-lookup customer IDs (server-side guarantee)

**File: `supabase/functions/widget-ai-chat/index.ts`** (lines ~339-361)

Modify `patchBookingSummary` to **always** perform a fresh customer lookup when `visitorPhone` or `visitorEmail` is available, regardless of what the AI emitted. The real IDs from the API always take priority over whatever the LLM hallucinated.

```text
Before: if (!summaryData.user_id || !summaryData.user_group_id) { re-lookup }
After:  if (visitorPhone || visitorEmail) { ALWAYS re-lookup and overwrite }
```

### Change 2: Remove fake IDs from system prompt example

**File: `supabase/functions/widget-ai-chat/index.ts`** (line ~852)

Change the example to use placeholder text that the AI won't copy as real numbers:

```text
Before: "user_id":48372,"user_group_id":29104
After:  "user_id":"<FROM_LOOKUP>","user_group_id":"<FROM_LOOKUP>"
```

Also update the BOOKING_SUMMARY instruction (line ~694) similarly.

### Change 3: Tell AI not to guess IDs

Add explicit instruction: "For user_id and user_group_id, use the EXACT values from the customer lookup tool result. NEVER invent or guess these values."

## Why This Works

- Even if the AI still emits fake IDs, the server always overwrites them with real ones from the API
- The prompt change reduces the likelihood of fake IDs being emitted in the first place
- The documentation (NODDI_API_ENDPOINTS.md) already specifies the correct payload format -- this fix ensures the code follows it
