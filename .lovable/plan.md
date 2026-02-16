

# Fix: Booking Edit Flow Stability + YES/NO Enforcement + Error Diagnostics Dashboard

## Three changes needed

### 1. Critical Bug: `patchBookingEdit` references undefined `marker` variable

The previous edit accidentally removed the `const marker = '[BOOKING_EDIT]';` line from `patchBookingEdit`. The function now references an undefined `marker` variable, causing `reply.indexOf(undefined)` to return `-1` every time. This means:
- Booking edit JSON patching (replacing placeholder IDs, injecting delivery window times) is completely silently broken
- After the user selects a new time slot, the `[BOOKING_EDIT]` marker data is never fixed up, leading to failures

**Fix**: Add `const marker = '[BOOKING_EDIT]';` back as the first line of `patchBookingEdit`, and fix the indentation.

### 2. Strengthen `patchYesNo` with broader catch-all pattern

The current `patchYesNo` function only catches specific hardcoded phrases. A more robust approach is to add a generic catch-all: any sentence ending with `?` that does not already contain a marker and where the reply has no other interactive markers should be considered for wrapping.

**Fix**: Add a broader fallback regex that catches any Norwegian/English question ending with `?` that looks like a binary yes/no question (contains keywords like "riktig", "korrekt", "bekrefte", "endre", "correct", "confirm", "want to", etc.)

### 3. New Admin Dashboard Tab: "Error Traces" for Booking Edit Diagnostics

Add a new tab to the AI Chatbot settings page showing recent conversations where the safety break triggered or the fallback message was returned. This surfaces:
- Conversations where `tools_used` contains `get_delivery_windows` or `update_booking` AND the assistant's final message contains the "Beklager" fallback
- Conversations where the loop was broken (identifiable by checking if assistant messages contain the fallback text)
- Quick runbook links for common failure modes

This will be a new component `AiErrorTraces.tsx` in `src/components/admin/widget/`.

---

## Technical Details

### File: `supabase/functions/widget-ai-chat/index.ts`

**Change A** (~line 438): Fix `patchBookingEdit` — add missing `marker` declaration

```typescript
function patchBookingEdit(reply: string, messages: any[]): string {
  const marker = '[BOOKING_EDIT]';
  const closingMarker = '[/BOOKING_EDIT]';
  // ... rest unchanged
}
```

**Change B** (~line 404): Broaden `patchYesNo` with additional catch-all patterns

Add these patterns to the existing array:
- `/(?:Kan|Kunne) du bekrefte\b.*\?/i`
- `/(?:Stemmer|Passer) (?:det|dette)\b.*\?/i`  
- `/Er du sikker\b.*\?/i`
- Generic fallback: any short sentence (under 120 chars) ending with `?` that contains confirmation keywords

### File: `src/components/admin/widget/AiErrorTraces.tsx` (new)

A diagnostic dashboard component that:
- Queries `widget_ai_conversations` joined with `widget_ai_messages` to find conversations where:
  - The last assistant message contains "Beklager" or the fallback text
  - `tools_used` includes booking-related tools
- Shows a table with: timestamp, visitor phone/email, tools used, last AI message preview
- Each row is expandable to show the full conversation
- Includes a "Runbook" section with common failure modes and their fixes

### File: `src/components/admin/AiChatbotSettings.tsx`

Add the new "Error Traces" tab (7th tab) with a bug/alert icon.

### File: `src/components/admin/widget/index.ts`

Export `AiErrorTraces`.

### Deploy

Re-deploy `widget-ai-chat` edge function after fixing the `patchBookingEdit` bug.
