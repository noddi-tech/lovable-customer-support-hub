

# Fix: AI copies example user_id (12345) instead of real values

## Problem

The BOOKING_SUMMARY marker example in the AI prompt contains hardcoded placeholder IDs:
```
"user_id":12345,"user_group_id":6789
```

The AI model is copying these example values verbatim into the actual booking summary instead of using the real user ID and user group ID returned from the `lookup_customer` tool call.

## Fix

**File**: `supabase/functions/widget-ai-chat/index.ts` (line 1025-1026)

Replace the example with clearly fake placeholder text that the AI cannot mistake for real values, and add an explicit instruction:

```
12. BOOKING SUMMARY - show a booking summary card with confirm/cancel.
CRITICAL: You MUST replace ALL placeholder values with REAL data from the conversation.
- user_id and user_group_id: use the ACTUAL values returned by lookup_customer, NEVER use example numbers.
- delivery_window_id: use the ACTUAL ID from the selected time slot.
- address_id: use the ACTUAL ID from the selected address.
Example format (replace ALL values with real data):
[BOOKING_SUMMARY]{"address":"<real address>","address_id":<real_id>,"car":"<real car>","license_plate":"<real plate>","country_code":"NO","user_id":<REAL_USER_ID_FROM_LOOKUP>,"user_group_id":<REAL_GROUP_ID_FROM_LOOKUP>,"service":"<real service>","sales_item_ids":[<real_ids>],"date":"<real date>","time":"<real time>","price":"<real price>","delivery_window_id":<real_id>}[/BOOKING_SUMMARY]
```

Using angle-bracket placeholders like `<REAL_USER_ID_FROM_LOOKUP>` instead of numeric examples prevents the AI from blindly copying them.

## Deployment
- Redeploy `widget-ai-chat` edge function

