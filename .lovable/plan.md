

# Fix Remaining AI Chatbot Issues

Three issues persist after previous fixes. Here's the root cause analysis and fix for each.

---

## Issue 1: Still asks "Har du bestilt gjennom Noddi for?" after verification

**Root Cause**: The `buildFlowPrompt` post-verification instructions on line 772-773 tell the AI to auto-evaluate "existing customer" decisions, but this is just a text instruction the AI can ignore. The actual flow tree still contains the decision node, and the AI follows it literally.

**Fix** (`supabase/functions/widget-ai-chat/index.ts`):
- In the `__VERIFIED__` replacement (line 1209-1212), add a stronger instruction: explicitly state that the customer lookup result determines "existing customer" status and the AI must NEVER ask this question.
- In `buildPostVerificationNodes`, detect decision nodes that check "existing"/"customer" and auto-resolve them in the prompt text instead of presenting as YES/NO.
- Make the post-verification system prompt more forceful: "You ALREADY KNOW if the customer is existing from the lookup_customer result. If the result contains bookings, they are existing. NEVER ask the customer if they have ordered before."

---

## Issue 2: Address payload displayed as user message with duplicate city

**Root Cause**: The `handleActionSelect` label extraction (lines 238-241) creates `displayLabel = "addr, city"`. But if `parsed.address` already contains the city (e.g., "Slemdalsvingen 65, Oslo"), the result becomes "Slemdalsvingen 65, Oslo, Oslo".

Additionally, `sendMessage` on line 273 sends the full JSON as a hidden message, which correctly goes to the AI -- but looking at the screenshot, the address bubble says "Slemdalsvingen 65, Oslo, Oslo" (with duplicate city), meaning the label extraction is running but producing a bad label.

**Fix** (`src/widget/components/AiChat.tsx`):
- Fix the address label extraction to avoid city duplication: if `parsed.address` already contains the city name, don't append it again.
- Simplify: just use `parsed.full_address || parsed.address` as the display label without appending city.

---

## Issue 3: `[LICENSE_PLATE]` shown as raw text instead of rendering the component

**Root Cause**: The AI is emitting `[LICENSE_PLATE]` without the closing `[/LICENSE_PLATE]` tag. Looking at the screenshot, the text shows literally `[LICENSE_PLATE]` with no closing tag. The parser in `parseMessageBlocks.ts` (lines 60-65) checks for the closing tag -- if `closeIdx === -1` (closing tag not found), it treats the remaining text as plain text, so the marker is displayed literally.

The system prompt (line 922) shows `[LICENSE_PLATE][/LICENSE_PLATE]` -- the tags are back-to-back with no content. The AI may be omitting the closing tag because it thinks it's self-closing or because it only remembers the opening tag.

**Fix** (`supabase/functions/widget-ai-chat/index.ts`):
- Change the LicensePlateBlock registration to be self-closing (no closing marker needed), OR
- Strengthen the system prompt instruction to emphasize the closing tag is REQUIRED.
- Safest approach: make the parser handle `[LICENSE_PLATE]` as self-closing when no closing tag is found, similar to `[PHONE_VERIFY]` and `[EMAIL_INPUT]` which don't require closing tags.

The cleanest fix is to change LicensePlateBlock's registration to not require a closing marker since it doesn't use inner content anyway.

---

## Technical Summary

| File | Change |
|------|--------|
| `supabase/functions/widget-ai-chat/index.ts` | Strengthen post-verification prompt to never ask "ordered before?". Update `[LICENSE_PLATE]` instruction to use self-closing format. |
| `src/widget/components/AiChat.tsx` | Fix address label to avoid duplicate city (use `full_address` or `address` directly without appending city). |
| `src/widget/components/blocks/LicensePlateBlock.tsx` | Remove `closingMarker` from registration so it works as self-closing like `[PHONE_VERIFY]`. Update `parseContent` accordingly. |

