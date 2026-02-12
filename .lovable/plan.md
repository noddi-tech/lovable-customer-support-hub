
# Fix: AI Writing Addresses and Services as Plain Text Instead of Interactive Blocks

## Root Cause

The system prompt in `widget-ai-chat/index.ts` has **three conflicting/incomplete sections** that cause the AI to fall back to plain text lists instead of using interactive markers:

1. **INTERACTIVE COMPONENTS section (lines 988-992)**: This is the AI's primary reference for marker syntax. It shows `[ADDRESS_SEARCH]Search address...[/ADDRESS_SEARCH]` without explaining how to pass stored addresses as JSON. It also still says LICENSE_PLATE is "self-closing, NO closing tag needed" -- contradicting the earlier fix.

2. **Hardcoded fallback (line 942)**: Says "you MUST pass them inside the ADDRESS_SEARCH / LICENSE_PLATE markers" but the INTERACTIVE COMPONENTS section (which the AI actually reads for syntax) doesn't show the JSON format for stored data.

3. **Services**: The AI calls `list_available_services` tool, gets text results, and writes them as a numbered list instead of using `[SERVICE_SELECT]`. Nothing in the system prompt forbids listing services as text or strongly mandates using the marker.

## Changes

**File: `supabase/functions/widget-ai-chat/index.ts`**

### Change 1: Fix ADDRESS_SEARCH marker docs (lines 988-989)
Update the INTERACTIVE COMPONENTS section to show the stored addresses JSON format:

```
8. ADDRESS SEARCH - render an interactive address search with delivery area check:
If the customer has stored_addresses from lookup_customer, pass them as JSON:
[ADDRESS_SEARCH]{"stored": [{"id": 2860, "label": "Holtet 45, 1368 Oslo", "zip_code": "1368", "city": "Oslo"}]}[/ADDRESS_SEARCH]
If no stored addresses: [ADDRESS_SEARCH][/ADDRESS_SEARCH]
NEVER list addresses as plain text. ALWAYS use this marker.
```

### Change 2: Fix LICENSE_PLATE marker docs (lines 991-992)
Remove the "self-closing" instruction. Update to show stored cars JSON format:

```
9. LICENSE PLATE - render a license plate input with car lookup:
If the customer has stored_cars from lookup_customer, pass them as JSON:
[LICENSE_PLATE]{"stored": [{"id": 13888, "make": "Tesla", "model": "Model Y", "plate": "EC94156"}]}[/LICENSE_PLATE]
If no stored cars: [LICENSE_PLATE][/LICENSE_PLATE]
NEVER list license plates or cars as plain text. ALWAYS use this marker.
```

### Change 3: Fix SERVICE_SELECT marker docs (lines 994-995)
Add a stronger instruction to never list services as text:

```
10. SERVICE SELECT - fetch and display available sales items with prices. Include address_id AND license_plate:
[SERVICE_SELECT]{"address_id": 2860, "license_plate": "EC94156"}[/SERVICE_SELECT]
NEVER list services or categories as plain text. ALWAYS use this marker. The widget fetches and displays them automatically.
```

### Change 4: Add a global rule (around line 1004, RULES FOR MARKERS section)
Add a hard rule:

```
- NEVER list addresses, license plates, cars, or services as numbered text. ALWAYS use the corresponding interactive marker.
```

## Deployment

Redeploy `widget-ai-chat` edge function. No frontend changes needed.
