

# Fix: AI Must Emit `[TIME_SLOT]` Immediately After Service Selection

## Problem
After the customer selects an address, enters their car registration, and picks a service, the AI says "please wait" instead of emitting the `[TIME_SLOT]` marker. The AI doesn't realize the widget component handles all the data fetching -- it just needs to output the marker with the correct address_id and service slug.

## Changes

### 1. Update `time_slot` instruction in `supabase/functions/widget-ai-chat/index.ts` (~line 542-551)

Replace the current `time_slot` block prompt with a stronger instruction that:
- Commands the AI to emit the marker **immediately** after service selection -- no "please wait" or "let me check"
- Reminds the AI that the widget fetches data automatically
- Tells it to extract the numeric `address_id` from the address JSON payload earlier in the conversation
- Uses the service slug from the service selection payload (e.g., `dekkskift`)

New instruction (roughly):
```
IMMEDIATELY after the customer selects a service, you MUST include:
[TIME_SLOT]<numeric_address_id>::<service_slug>[/TIME_SLOT]

The widget handles ALL data fetching automatically.
DO NOT say "please wait", "let me check", or similar -- just emit the marker.

Rules:
- address_id = the numeric "address_id" from the address JSON in the conversation
- service_slug = the "type_slug" from the service selection JSON
- CORRECT: [TIME_SLOT]2860::dekkskift[/TIME_SLOT]
- WRONG: [TIME_SLOT]Slemdalsvingen 65::dekkskift[/TIME_SLOT]
- If no numeric address_id exists, ask the customer to select their address first.
```

### 2. Redeploy `widget-ai-chat`

Deploy the updated edge function so the new prompt takes effect.

## Technical Notes

- The `TimeSlotBlock` component already handles everything: it calls `earliest_date`, then `delivery_windows` with a 14-day range, groups by date, and shows only the first available date's slots
- The `parseContent` function extracts `address_id` (first part) and `proposal_slug` (second part after `::`) from the marker content
- The component also checks `data.selected_sales_item_ids` but this is optional -- the basic flow works with just address_id
