

# Fix Three AI Chatbot Issues: Change Time Flow, Duplicate Summary, and Timezone

## Issue 1: "Change Booking Time" Flow Fails and Language Switches

**Root Cause:** The `widget-ai-chat` edge function has a `maxIterations = 5` loop for tool calls. The "change_time" flow requires multiple tool calls (lookup_customer, get_booking_details, then potentially get_delivery_windows), which can exhaust iterations before the AI emits the [TIME_SLOT] marker. When iterations are exhausted, the fallback message is hardcoded in English: `"I apologize, but I need a moment. Could you please try rephrasing your question?"` -- this causes the language switch.

**Fix (2 changes in `supabase/functions/widget-ai-chat/index.ts`):**

1. **Increase `maxIterations` from 5 to 8** (line 1166) to give multi-step flows enough room.
2. **Make the fallback message language-aware** (line 1254). Use the `language` variable from the request body to return Norwegian or English appropriately:
   - Norwegian: `"Beklager, men jeg trenger et øyeblikk. Kan du prøve å omformulere spørsmålet ditt?"`
   - English: current message

---

## Issue 2: AI Emits Both Text Summary AND [BOOKING_SUMMARY] Component

**Root Cause:** The system prompt's instructions for BOOKING_SUMMARY (lines 849-854) don't explicitly tell the AI to ONLY output the marker and nothing else. The AI adds a long text recap before the JSON component (as seen in the screenshot showing "Fantastisk! Den tilgjengelige leveringstiden..." followed by the card).

**Fix (1 change in `supabase/functions/widget-ai-chat/index.ts`):**

Update the BOOKING_SUMMARY section in `buildSystemPrompt` (around lines 849-854) to add a strict "no text" rule, similar to what ADDRESS_SEARCH and LICENSE_PLATE already have:

Add this instruction:
```
CRITICAL: After the customer selects a time slot, your ENTIRE response must be ONLY the [BOOKING_SUMMARY] marker with valid JSON. Do NOT write any introductory text, recap, or description before or after the marker. The component itself displays all the booking details visually.
```

Also update the `BLOCK_PROMPTS` for BOOKING_SUMMARY (line 692) to include:
```
Your ENTIRE response must be ONLY the [BOOKING_SUMMARY] marker. No text before or after. The component displays all details.
```

---

## Issue 3: Delivery Window Times Shown in UTC Instead of Local (Oslo) Time

**Root Cause:** The `TimeSlotBlock.tsx` `formatTime` function (line 12-14) simply slices the ISO string at position 11-16 to extract the time, which shows UTC times. The Noddi API returns delivery windows in UTC, but the actual times are for Oslo (Europe/Oslo, UTC+1/+2). For example, `06:00-11:00` UTC is actually `07:00-12:00` in Oslo.

This also affects:
- The submitted badge showing the selected time
- The BookingSummaryBlock displaying the time
- The BookingEditConfirmBlock displaying old/new times

**Fix (changes in `src/widget/components/blocks/TimeSlotBlock.tsx`):**

1. **Replace the `formatTime` helper** with a timezone-aware version that converts UTC ISO strings to `Europe/Oslo` local time:

```typescript
function formatTime(iso: string): string {
  try {
    const date = new Date(iso);
    if (isNaN(date.getTime())) return iso.slice(11, 16);
    return date.toLocaleTimeString('nb-NO', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
      timeZone: 'Europe/Oslo',
    });
  } catch {
    return iso.slice(11, 16);
  }
}
```

2. **Also update `formatDate`** to use timezone-aware parsing so dates near midnight boundaries display correctly:

```typescript
function formatDate(dateStr: string): string {
  const d = new Date(dateStr + 'T12:00:00Z'); // noon UTC avoids date shifts
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', ...];
  return `${days[d.getUTCDay()]} ${d.getUTCDate()} ${months[d.getUTCMonth()]}`;
}
```

3. **Update the `handleSlotSelect` callback** to store the Oslo-local formatted times in the payload (so the submitted badge and downstream BookingSummaryBlock show correct times).

---

## Summary of Files Changed

| File | Changes |
|------|---------|
| `supabase/functions/widget-ai-chat/index.ts` | Increase maxIterations to 8; language-aware fallback message; stronger BOOKING_SUMMARY prompt rules |
| `src/widget/components/blocks/TimeSlotBlock.tsx` | Timezone-aware `formatTime` and `formatDate` using `Europe/Oslo` |

## Technical Details

- The `Europe/Oslo` timezone is hardcoded because Noddi operates exclusively in Norway. All delivery windows from the API are UTC but represent Oslo-local service times.
- The `toLocaleTimeString` with `timeZone` option is supported in all modern browsers and Deno.
- The fallback in `formatTime` (plain slice) ensures graceful degradation if the ISO string is malformed.
- Increasing `maxIterations` from 5 to 8 gives the change_time flow room for: lookup_customer (1) + get_booking_details (1) + get_delivery_windows (1) + potential retries = comfortably under 8.

