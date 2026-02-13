

# Fix: AI Listing Addresses as Text Before the Interactive Block

## Problem

After phone verification and customer lookup, the AI first sends a message listing all stored addresses as a bullet-point text list ("Hei Joachim! Du har flere adresser lagret, inkludert: ..."), and then sends a second message with the interactive `[ADDRESS_SEARCH]` block showing the same addresses as tappable pills. This is redundant and makes the conversation unnecessarily long.

## Root Cause

The system prompt (lines 764-771) instructs the AI to "greet them by name" and describe what it found (bookings, vehicles) after looking up the customer. The AI interprets this as listing all addresses/cars as text. The constraint "your ENTIRE message must be ONLY the marker" only applies when the AI decides to emit the marker, but the AI first sends a text summary, then a separate marker message.

## Fix

**File: `supabase/functions/widget-ai-chat/index.ts`** (lines 764-771)

Update the post-lookup instructions to explicitly forbid listing addresses or cars as text:

```
After looking up the customer:
- Greet them by name.
- If they have UPCOMING bookings, mention them briefly.
- NEVER list stored addresses or vehicles as a text list. The interactive blocks ([ADDRESS_SEARCH], [LICENSE_PLATE]) already display them as selectable options.
- When it's time to collect an address, output ONLY the [ADDRESS_SEARCH] marker with stored addresses in JSON — no introductory text.
- When it's time to collect a car, output ONLY the [LICENSE_PLATE] marker with stored cars in JSON — no introductory text.
- If the customer already stated what they want, proceed with the matching action flow.
- If not, offer available actions naturally in conversation (do NOT force a menu).
- IMPORTANT: You ALREADY KNOW whether this is an existing customer from the lookup result. NEVER ask "have you ordered before?".
- If the customer has stored_addresses or stored_cars, you MUST pass them inside the ADDRESS_SEARCH / LICENSE_PLATE markers as JSON.
```

This is a small text change in the system prompt that explicitly tells the AI not to list addresses/cars as text, since the interactive components already show them.
