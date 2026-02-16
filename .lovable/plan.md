
# Fix: AI Still Not Using BOOKING_INFO + Hallucinating Example Data

## Problems

### Problem 1: patchBookingInfo regex is too narrow
The post-processor only detects patterns like "Adresse:", "Dato:", "Tid:" but the AI writes natural language like "Du har en planlagt bestilling den 17. februar 2026 kl. 07:00-12:00". None of the regexes match, so the post-processor silently exits and the plain text passes through.

### Problem 2: BOOKING_CONFIRMED example still has literal `12345`
Line 1067 still contains `"booking_id": 12345, "booking_number": "B-12345"` as a literal example. The AI copies these values verbatim. The same pattern was fixed for BOOKING_EDIT and BOOKING_INFO but missed for BOOKING_CONFIRMED.

### Problem 3: AI fabricating booking data from examples
The second screenshot shows completely wrong address ("Ostmarkveien 5C"), wrong car ("Bmw Ix xdrive40"), wrong date ("2026-02-24") — none of which belong to the user. The AI is inventing data, possibly from the example in the prompt or from unrelated context.

## Fixes

### Fix 1: Broaden patchBookingInfo detection
Add detection for natural language booking mentions (not just "Dato:" labels):
- "bestilling den" (Norwegian: "booking on")
- "planlagt bestilling" (Norwegian: "planned booking")
- Date patterns like "17. februar" embedded in prose
- Any message containing `[ACTION_MENU]` where tool results have booking data but no `[BOOKING_INFO]` is present

The key insight: if the reply has `[ACTION_MENU]` AND the conversation has booking data from tool results, the booking info card should ALWAYS be injected regardless of what text the AI wrote.

### Fix 2: Replace BOOKING_CONFIRMED example IDs
Change line 1067 and 1240 from literal `12345` / `B-12345` to `<REAL_ID>` / `<REAL_REF>` placeholders, matching what was already done for BOOKING_INFO and BOOKING_EDIT.

### Fix 3: Add patchBookingConfirmed post-processor
Similar to patchBookingEdit, scan tool results for the actual booking ID/reference and override whatever the AI emitted. This prevents hallucinated IDs from reaching the user.

---

## Technical Details

### File: `supabase/functions/widget-ai-chat/index.ts`

**Change A** -- Broaden `patchBookingInfo` trigger logic (lines 482-497):

Replace the narrow regex detection with a broader rule:
```typescript
function patchBookingInfo(reply: string, messages: any[]): string {
  if (reply.includes('[BOOKING_INFO]')) return reply;
  
  // BROAD TRIGGER: If reply has [ACTION_MENU] and conversation has booking data,
  // always inject [BOOKING_INFO] — the AI should never show booking context as plain text
  const hasActionMenu = reply.includes('[ACTION_MENU]');
  
  // Also detect plain-text booking details (narrow patterns kept as additional triggers)
  const hasPlainTextDetails = /Adresse\s*:|Dato\s*:|Tid\s*:|bestilling\s+den|planlagt\s+bestilling/i.test(reply);
  const hasFailureMsg = /ikke fikk tilgang|couldn't access|ikke finne detalj|kunne ikke hente/i.test(reply);
  
  // Trigger if: has ACTION_MENU (booking edit flow), OR plain text details, OR failure message
  if (!hasActionMenu && !hasPlainTextDetails && !hasFailureMsg) return reply;
  
  // ... rest of extraction logic unchanged ...
}
```

**Change B** -- Fix BOOKING_CONFIRMED example IDs (lines 1066-1068 and 1238-1240):

```
// Line 1067: Change from literal to placeholder
[BOOKING_CONFIRMED]{"booking_id": <REAL_ID>, "booking_number": "<REAL_REF>", 
  "service": "...", "address": "...", ...}[/BOOKING_CONFIRMED]

// Line 1240: Same change
```

**Change C** -- Add `patchBookingConfirmed` post-processor:

New function that scans for `[BOOKING_CONFIRMED]` markers, extracts the JSON, and overrides `booking_id` / `booking_number` with real values from tool results (similar to how `patchBookingEdit` works). Also validates that address/car/date match actual booking data from tool results to prevent fabricated details.

**Change D** -- Also clean up the plain-text lines in `patchBookingInfo` removal regex (lines 559-571):

Add regex to remove natural language booking sentences:
```typescript
// Remove natural language booking descriptions
cleaned = cleaned.replace(/^.*(?:planlagt bestilling|har en bestilling|din bestilling).*$/gim, '');
```

### Deploy
Re-deploy `widget-ai-chat` edge function after changes.
