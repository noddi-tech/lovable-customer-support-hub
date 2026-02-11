
# Fix AI Chatbot Conversation Flow and Data Display Issues

## Issues Overview

There are 6 distinct problems with the AI chatbot conversation flow, spanning both the edge function logic and the frontend widget.

---

## Issue 1: Shows options AND asks to verify simultaneously

**Problem**: When the user says "I want to make a booking", the AI shows an ACTION_MENU with options (Bestille ny tjeneste, Se mine bestillinger, etc.) AND asks for phone verification in the same response. It should go straight to verification first.

**Root Cause**: The pre-verification flow prompt (`buildPreVerificationFlowPrompt`) walks the tree and outputs both the action menu node AND the phone verification node before stopping. The flow config has the action menu ("Present Actions") as a parent node containing phone verification as a child. The function traverses into the action menu before reaching the phone node.

**Fix in `widget-ai-chat/index.ts`**: Restructure the `buildPreVerificationFlowPrompt` to prioritize phone verification. When the flow has phone verification, the pre-verification prompt should instruct the AI to ask for verification FIRST, before showing any menus or options. Add explicit instruction: "Before presenting any options or menus, you MUST first verify the customer's phone number."

---

## Issue 2: After verifying, asks "what would you like to do?" again

**Problem**: After phone verification + customer lookup, the AI presents the same menu options again instead of continuing from where the user left off (they already said they want to make a booking).

**Root Cause**: The `__VERIFIED__` trigger message is generic ("I have just verified my phone number. Please look up my account and continue with the next step in the flow."). It doesn't carry forward the user's original intent. The system prompt's post-verification flow just rebuilds the full remaining tree.

**Fix in `widget-ai-chat/index.ts`**: When the `__VERIFIED__` message is processed, replace it with a context-aware message that references the user's earlier stated intent. Modify line 1217-1219: when replacing `__VERIFIED__`, scan the conversation history for the user's original intent and include it. For example: "I have just verified my phone number. I previously said I want to make a booking. Please look up my account and continue directly with booking a new service."

**Fix in `AiChat.tsx`**: When sending the `__VERIFIED__` trigger, include the user's last non-hidden message content so the AI knows what the user originally wanted.

---

## Issue 3: "Bestille ny tjeneste" asks if ordered before -- should use API data

**Problem**: After verification, the AI asks "Har du bestilt fra oss tidligere?" (Have you ordered before?) -- but it already looked up the customer via the API and knows this.

**Root Cause**: The flow config has a Decision node "New Decision" with `check: "customer is existing"` set to `ask_customer` mode (not `auto_evaluate`). This means the AI presents it as a YES/NO question instead of auto-evaluating from the lookup data.

**Fix in `widget-ai-chat/index.ts`**: In the `buildNodePrompt` function, when processing decision nodes for post-verification flows (where customer data has been looked up), treat "customer is existing" decisions as auto-evaluate regardless of the config setting. The lookup_customer tool result already contains `found: true/false` and booking history. Add logic: if the decision check mentions "existing" or "customer" and the customer is verified, auto-evaluate based on lookup data.

Alternatively (and simpler): Add a system prompt instruction in the post-verification context: "You have already looked up the customer. If you found bookings in their history, they are an existing customer -- do NOT ask them if they have ordered before. Use the data you already have."

---

## Issue 4: Address payload shown as user message in chat

**Problem**: When the address block returns its payload (JSON with address, delivery_area, zip_code, city), it's sent via `handleActionSelect` which calls `sendMessage(option)` -- displaying the raw JSON as a user bubble.

**Root Cause**: In `AiChat.tsx` line 228-232, `handleActionSelect` calls `sendMessage(option)` with the raw JSON payload from the block. This creates a visible user message bubble with the JSON string.

**Fix in `AiChat.tsx`**: In `handleActionSelect`, detect if the payload is JSON (from interactive blocks like address, license plate, etc.) and either:
- Extract a human-readable label from the JSON to display as the user message
- OR send the message as hidden (like `__VERIFIED__`)

The approach: parse the JSON payload and extract a display label. For address: show "Holtet 45, Stabekk". For car: show "Tesla Model Y (EC94156)". Send the full JSON payload to the AI but display only the label in the chat.

---

## Issue 5: Car payload shown as user message (same as #4)

**Problem**: Same root cause as Issue 4. The license plate block returns JSON like `{"make":"Tesla","model":"Model y","license_plate":"EC94156"}` and it's displayed raw.

**Fix**: Same fix as Issue 4 -- the `handleActionSelect` function will parse JSON payloads and extract display labels for all block types.

---

## Issue 6: Fails fetching service availability (502 error)

**Problem**: The `noddi-booking-proxy` returns 502 with "Failed to fetch services" because the Noddi API returns 404 for `/v1/booking-proposals/types/`.

**Root Cause**: The endpoint `/v1/booking-proposals/types/` doesn't exist or has moved in the Noddi API. The logs confirm: `List services error: 404 {"type": "client_error", "errors": [{"code": "not_found", "detail": "Not found."}]}`.

**Fix in `noddi-booking-proxy/index.ts`**: The endpoint needs to be updated to the correct Noddi API path. Since we don't know the exact new endpoint, we should:
1. Try the alternative endpoint `/v1/service-categories/` or `/v1/sales-items/` 
2. If that also fails, add a hardcoded fallback list of known Noddi services (dekkskift, bilvask, etc.) so the flow doesn't break entirely
3. Return a more helpful error message

**Note**: This may require checking with the Noddi API documentation for the correct endpoint. As an interim fix, we can have the AI use the `list_available_services` tool which calls the same proxy -- if the endpoint is wrong, we should update it or use a fallback.

---

## Technical Summary of Changes

| File | Changes |
|------|---------|
| `supabase/functions/widget-ai-chat/index.ts` | 1) Fix pre-verification prompt to prioritize phone verify over menus. 2) Make `__VERIFIED__` carry user's original intent. 3) Add post-verification instruction to not re-ask "existing customer?" when data is known. |
| `src/widget/components/AiChat.tsx` | 1) Pass user's last intent with `__VERIFIED__` trigger. 2) Parse JSON payloads in `handleActionSelect` to show human-readable labels instead of raw JSON. |
| `supabase/functions/noddi-booking-proxy/index.ts` | Update or add fallback for the `list_services` endpoint that returns 404. |
