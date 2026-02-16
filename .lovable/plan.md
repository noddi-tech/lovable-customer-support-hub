
# Fix: Booking ID in BOOKING_EDIT, AI Not Using BOOKING_INFO, Better Error Logging

## Problems Identified

### 1. Booking ID Missing in BOOKING_EDIT Header
Screenshot shows "Confirm changes to booking #" with no number. The `patchBookingEdit` function correctly scans for the real booking ID, but it only overrides when `realBookingId !== editData.booking_id`. If the AI emits `booking_id: undefined` or omits it entirely, the comparison fails because `undefined !== null` evaluates oddly. Additionally, the `toolResult.id` check (line 488) is too broad -- it could match car IDs, address IDs, or other numeric IDs that happen to be > 100.

**Fix**: 
- In `patchBookingEdit`, always set `editData.booking_id = realBookingId` if `realBookingId` is found (remove the conditional comparison)
- Remove the `toolResult.id` fallback (too broad) -- only trust `toolResult.bookings[0].id` and `toolResult.booking.id`
- If `editData.booking_id` is falsy/0/undefined after the scan, do the fresh `executeLookupCustomer` fallback (already coded but gated behind wrong condition)

### 2. AI Not Using [BOOKING_INFO] Marker
The system prompt instructs the AI to use `[BOOKING_INFO]`, but the AI still outputs plain text. The prompt says "use [BOOKING_INFO] when showing a customer their current booking" but the AI ignores this because it sees the text instruction buried among 15 other markers. 

**Fix**: Strengthen the prompt by adding a hard rule in the "BOOKING EDIT FLOW" section: "In step 2, your response MUST contain the [BOOKING_INFO] marker. NEVER list address/date/time as plain text." Also add a post-processor `patchBookingInfo` that detects when the AI returns booking details as plain text (matching patterns like "Adresse:", "Dato:", "Tid:") alongside an `[ACTION_MENU]` and auto-wraps them in `[BOOKING_INFO]`.

### 3. Error Traces Not Capturing Errors
The Error Traces tab only detects errors by scanning for fallback phrases ("Beklager") in assistant messages. It misses:
- 400/502 errors from the proxy
- Silent failures where the AI produces wrong data
- Tool call errors

**Fix**: 
- Add an `error_details` column to `widget_ai_conversations` (text, nullable) to store structured error info
- In the edge function, when errors occur (tool failures, fallback triggered, loop exhaustion), write error details to this column
- Update `AiErrorTraces.tsx` to also query by `error_details IS NOT NULL` (not just fallback phrases) and display the error details in the expanded view

---

## Technical Details

### File: `supabase/functions/widget-ai-chat/index.ts`

**Change A** - Fix `patchBookingEdit` booking ID logic (~line 469-524):
```typescript
// Simplified: always prefer bookings[0].id or booking.id
let realBookingId: number | null = null;
for (let i = messages.length - 1; i >= 0; i--) {
  const msg = messages[i];
  if (msg.role === 'tool' && typeof msg.content === 'string') {
    try {
      const toolResult = JSON.parse(msg.content);
      if (toolResult.booking?.id) {
        realBookingId = toolResult.booking.id;
        break;
      }
      if (toolResult.bookings?.length > 0) {
        realBookingId = toolResult.bookings[0].id;
        break;
      }
    } catch { /* not JSON */ }
  }
}

// Fresh lookup fallback if still missing
if (!realBookingId) {
  const phone = visitorPhone || '';
  const email = visitorEmail || '';
  if (phone || email) {
    try {
      const lookupResult = JSON.parse(await executeLookupCustomer(phone, email));
      if (lookupResult.bookings?.length > 0) {
        realBookingId = lookupResult.bookings[0].id;
      }
    } catch (e) { console.error('[patchBookingEdit] Fresh lookup failed:', e); }
  }
}

// Always override if we found a real ID
if (realBookingId) {
  editData.booking_id = realBookingId;
}
```

**Change B** - Add error logging helper and save errors to DB:
- Create `saveErrorDetails(supabase, conversationId, errorType, details)` function
- Call it when: loop exhaustion, tool errors, fallback messages sent, recovery call failures
- Updates `widget_ai_conversations.error_details` with a JSON string

**Change C** - Strengthen system prompt for BOOKING_INFO usage (~line 1132-1137):
```
2. If the customer has only ONE active booking, present its details using 
   [BOOKING_INFO]{"booking_id": <id>, "address": "<addr>", "date": "<date>", 
   "time": "<time>", "service": "<service>", "car": "<car>"}[/BOOKING_INFO]
   then ask what they want to change using [ACTION_MENU].
   NEVER list booking details as plain text bullet points (Adresse:, Dato:, Tid:).
```

### Database Migration
Add `error_details` column:
```sql
ALTER TABLE widget_ai_conversations 
ADD COLUMN IF NOT EXISTS error_details text;
```

### File: `src/components/admin/widget/AiErrorTraces.tsx`

**Change D** - Update query to also catch conversations with `error_details`:
- Add `error_details` to the select
- Filter: `hasFallback || conv.error_details`
- Display error_details in expanded view as a highlighted badge/block

### Deploy
Re-deploy `widget-ai-chat` edge function after all changes.
