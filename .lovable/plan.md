

# Fix: Booking Info and Action Menu Not Rendering After Verification

## Root Cause Analysis

There are **three cascading failures** causing this:

### Failure 1: `patchBookingInfo` regex patterns don't match the AI's actual output
The AI writes: *"Du har en **kommende** bestilling planlagt den 17. februar..."*

The regex patterns fail because:
- `har\s+en\s+bestilling` -- doesn't match because "kommende" sits between "en" and "bestilling"
- `bestilling\s+den` -- doesn't match because "planlagt" sits between
- `planlagt\s+bestilling` -- doesn't match because the AI writes "bestilling planlagt" (reversed)

This is a whack-a-mole problem. Every time we add patterns, the AI invents new phrasings.

### Failure 2: AI outputs a yes/no question instead of ACTION_MENU
The AI writes: *"Vil du endre tidspunkt, adresse, bil, eller legge til tjenester?"* as a plain-text question. The `patchYesNo` post-processor catches it and wraps it in `[YES_NO]` (thumbs up/down), but this should be an `[ACTION_MENU]` with separate clickable options like "Endre tid", "Endre adresse", etc.

### Failure 3: The pattern-matching approach is fundamentally fragile
We keep adding regex patterns, and the AI keeps finding new ways to say things in natural language.

## The Solution: Context-Based Detection (Not Text-Based)

Instead of trying to match what the AI **says**, check what the AI **knows** by scanning tool results in the conversation.

### Change A: Rewrite `patchBookingInfo` trigger logic

Replace all text-based regex triggers with a single context-based check:

```
If the conversation contains a lookup_customer or get_booking_details tool result 
with booking data, AND the reply does NOT already contain [BOOKING_INFO], 
THEN inject [BOOKING_INFO].
```

This eliminates all regex fragility. The post-processor fires based on data availability, not AI phrasing.

### Change B: Add `patchActionMenu` post-processor

New post-processor that detects when the AI asks about booking changes as plain text or YES_NO, and replaces it with a proper `[ACTION_MENU]`:

```
If the reply contains [BOOKING_INFO] (injected by Change A or AI-generated)
AND does NOT contain [ACTION_MENU]
AND the conversation context suggests a booking edit flow (customer has bookings, 
just verified, etc.)
THEN append [ACTION_MENU] with standard edit options 
("Endre tidspunkt", "Endre adresse", "Endre bil", "Legg til tjenester", "Avbestille")
AND strip the plain-text question + any [YES_NO] block.
```

### Change C: Run `patchActionMenu` BEFORE `patchYesNo`

In the post-processing pipeline, the new `patchActionMenu` must run before `patchYesNo` to prevent the yes/no wrapper from claiming questions that should be action menus.

### Change D: Fix `patchYesNo` to skip booking edit questions

Add a guard: if the reply mentions multiple booking edit options (tidspunkt, adresse, bil), skip `patchYesNo` entirely -- these are multi-option questions, not binary yes/no.

---

## Technical Details

### File: `supabase/functions/widget-ai-chat/index.ts`

**Change A** -- Rewrite `patchBookingInfo` trigger (lines 482-496):

Remove all regex-based triggers. Replace with:
```typescript
function patchBookingInfo(reply: string, messages: any[]): string {
  if (reply.includes('[BOOKING_INFO]')) return reply;
  
  // CONTEXT-BASED: Check if ANY tool result has booking data
  // This fires regardless of what the AI wrote in its reply
  let bookingData: any = null;
  for (let i = messages.length - 1; i >= 0; i--) {
    const msg = messages[i];
    if (msg.role === 'tool' && typeof msg.content === 'string') {
      try {
        const toolResult = JSON.parse(msg.content);
        if (toolResult.booking) { bookingData = toolResult.booking; break; }
        if (toolResult.bookings?.[0]) { bookingData = toolResult.bookings[0]; break; }
        // Direct get_booking_details shape (has .id and .scheduledAt at top level)
        if (toolResult.id && toolResult.scheduledAt) { bookingData = toolResult; break; }
      } catch { /* not JSON */ }
    }
  }
  
  if (!bookingData) return reply;
  
  // ... rest of info building + injection unchanged ...
}
```

**Change B** -- New `patchActionMenu` function (add after `patchBookingInfo`):

```typescript
function patchActionMenu(reply: string, messages: any[]): string {
  // Only inject if BOOKING_INFO is present (meaning we're in booking context)
  // and there's no ACTION_MENU already
  if (!reply.includes('[BOOKING_INFO]') || reply.includes('[ACTION_MENU]')) return reply;
  
  // Check that we have booking data in tool results (confirms booking edit context)
  let hasBooking = false;
  for (let i = messages.length - 1; i >= 0; i--) {
    if (messages[i].role === 'tool') {
      try {
        const r = JSON.parse(messages[i].content);
        if (r.bookings?.[0] || r.booking || (r.id && r.scheduledAt)) {
          hasBooking = true; break;
        }
      } catch {}
    }
  }
  if (!hasBooking) return reply;
  
  // Strip any YES_NO block and plain-text questions about changes
  let cleaned = reply;
  cleaned = cleaned.replace(/\[YES_NO\].*?\[\/YES_NO\]/gs, '');
  cleaned = cleaned.replace(/^.*(?:Vil du endre|Hva ønsker du|What would you like|What do you want to change).*$/gim, '');
  cleaned = cleaned.replace(/\n{3,}/g, '\n\n').trim();
  
  // Append ACTION_MENU with standard booking edit options
  const menu = `\n\n[ACTION_MENU]\nEndre tidspunkt\nEndre adresse\nEndre bil\nLegg til tjenester\nAvbestille bestilling\n[/ACTION_MENU]`;
  cleaned += menu;
  
  return cleaned;
}
```

**Change C** -- Update post-processing pipeline (lines 1713-1717 and 1821-1825):

```typescript
// Before (both locations):
reply = patchYesNo(reply);
reply = patchBookingConfirmed(reply, currentMessages);
reply = patchBookingInfo(reply, currentMessages);

// After:
reply = patchBookingConfirmed(reply, currentMessages);
reply = patchBookingInfo(reply, currentMessages);
reply = patchActionMenu(reply, currentMessages);  // NEW - must run before patchYesNo
reply = patchYesNo(reply);
```

**Change D** -- Add guard to `patchYesNo` (line 405):

```typescript
function patchYesNo(reply: string): string {
  if (reply.includes('[YES_NO]')) return reply;
  // Skip if reply already has ACTION_MENU (patchActionMenu may have added it)
  // ... existing marker check already covers this ...
  
  // NEW: Skip if the question mentions multiple booking edit options
  // These are multi-choice questions, not binary yes/no
  if (/(?:tidspunkt|adresse|bil).*(?:tidspunkt|adresse|bil)/i.test(reply)) return reply;
  
  // ... rest unchanged ...
}
```

### Deploy
Re-deploy `widget-ai-chat` edge function.

## Why This Will Work

1. **Context-based, not text-based**: `patchBookingInfo` fires whenever booking data EXISTS in tool results, regardless of how the AI phrases its response. No more regex whack-a-mole.
2. **Guaranteed ACTION_MENU**: When we inject `[BOOKING_INFO]`, we also inject `[ACTION_MENU]` with the correct edit options. The AI cannot skip this.
3. **Correct component type**: `patchActionMenu` runs BEFORE `patchYesNo`, so the multi-option question gets converted to clickable pills instead of thumbs up/down.
4. **Self-reinforcing**: Both post-processors work together -- if one fires, the other fires too, guaranteeing the complete UI (info card + action buttons) every time.

## Expected Result

After phone verification, the user will always see:
1. A styled blue `[BOOKING_INFO]` card showing their real booking (#27502) with address, date, time, service, and car
2. An `[ACTION_MENU]` with clickable pills: "Endre tidspunkt", "Endre adresse", "Endre bil", "Legg til tjenester", "Avbestille bestilling"
