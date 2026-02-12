

# Fix: Server-side inject missing booking IDs into BOOKING_SUMMARY

## Problem
The AI model (gpt-4o-mini) consistently omits `user_id`, `user_group_id`, and sometimes `delivery_window_id` from the BOOKING_SUMMARY JSON, despite explicit prompt instructions. Prompt engineering alone is unreliable for ensuring these fields are present.

## Solution
Add a **post-processing step** in `widget-ai-chat/index.ts` that scans the AI's final reply for `[BOOKING_SUMMARY]...[/BOOKING_SUMMARY]` markers and injects missing IDs by extracting them from the tool call history in the conversation.

The tool call results already contain:
- `lookup_customer` result has `customer.userId` and `customer.userGroupId`
- The selected time slot data (from user action messages) has the `delivery_window_id`

## Technical Details

### File: `supabase/functions/widget-ai-chat/index.ts`

1. **Add a helper function** `patchBookingSummary(reply, toolMessages)`:
   - Parse the `[BOOKING_SUMMARY]{...}[/BOOKING_SUMMARY]` JSON from the reply
   - Scan `toolMessages` for `lookup_customer` results to extract `userId` and `userGroupId`
   - If `user_id` or `user_group_id` are missing in the JSON, inject them
   - Return the patched reply string

2. **Call it before returning the final reply** (around line 1378):
   - After the tool-calling loop completes and we have the final `reply` text
   - Apply `patchBookingSummary(reply, currentMessages)` to ensure the fields are present
   - This happens before streaming or returning the JSON response

### Why this approach?
- The lookup_customer tool result is already in `currentMessages` as a tool response
- This is a deterministic fix -- no reliance on the AI model remembering values
- Zero impact on the rest of the flow; only activates when BOOKING_SUMMARY marker is detected
- The `delivery_window_id` typically comes from the user's time slot selection action, which is harder to extract server-side, but we can at least guarantee `user_id` and `user_group_id`

### Deployment
- Redeploy `widget-ai-chat`
