

# Fix: AI Not Emitting `[LICENSE_PLATE]` Marker

## Problem
The AI is asking for the license plate in plain text ("Vennligst skriv inn registreringsnummeret ditt") instead of emitting the `[LICENSE_PLATE]` marker that renders the interactive component. This happens because the flow-level instruction (BLOCK_PROMPTS) still tells the AI to use `[LICENSE_PLATE][/LICENSE_PLATE]` with a closing tag, contradicting the general prompt which says it's self-closing. The conflicting instructions confuse the AI into skipping the marker entirely.

## Fix

### 1. `supabase/functions/widget-ai-chat/index.ts` (line 535)

Update the `license_plate` block prompt instruction to match the self-closing format and be more forceful:

**Before:**
```
instruction: () => `To collect the customer's license plate, include the marker [LICENSE_PLATE][/LICENSE_PLATE] in your response. The widget will render a license plate input that looks up the car automatically. Do NOT ask for the plate number in text.`,
```

**After:**
```
instruction: () => `To collect the customer's license plate, include EXACTLY this marker in your response: [LICENSE_PLATE]
This is self-closing — do NOT add a closing tag. The widget renders an interactive license plate input with country selector and car lookup. NEVER ask for the plate number as plain text — ALWAYS use the [LICENSE_PLATE] marker.`,
```

### 2. Redeploy `widget-ai-chat`

Deploy the updated edge function so the corrected instruction takes effect.

