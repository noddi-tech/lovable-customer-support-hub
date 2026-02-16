

# Fix: Let Action Flows Drive Behavior + Multiple Bookings + UTC Time + Cancel Option

## Core Insight

You're right -- the action flows already define the correct step-by-step behavior. The problem is that the **system prompt overrides** the flow logic with hardcoded instructions like "mention upcoming bookings" and "offer available actions naturally." This causes the AI to improvise instead of following the defined flows.

## Issue 1: New booking flow mentions existing orders + only 1 stored address

**Root cause**: The system prompt (line 1581) says _"If they have UPCOMING bookings, mention them briefly."_ This fires even when the `new_booking` flow is matched. The AI should follow the flow's step 1 (ADDRESS_SEARCH) directly.

**Stored addresses**: The current code only extracts addresses from the user's **booking history**. If they only have 1 past booking, they only get 1 stored address. However, the Noddi `customer-lookup-support` response may contain addresses from ALL user groups. We should also extract addresses from `user_groups[].addresses` if available.

**Fix**:
- Update the system prompt (line 1577-1588) to be flow-driven: _"After looking up the customer, check which action flow matches their intent. If a flow is matched, proceed DIRECTLY to its first step. Do NOT mention existing bookings unless the matched flow's first step is a `lookup` type."_
- Extract stored addresses from `user_groups[].addresses` in addition to booking addresses (broader coverage)

## Issue 2: UTC time shown in BOOKING_SUMMARY confirmation card

**Root cause**: The TimeSlotBlock sends raw UTC timestamps. The AI copies them into the `[BOOKING_SUMMARY]` JSON `time` field without conversion. The component renders `data.time` as-is.

**Fix**: Add a `patchBookingSummaryTime` post-processor that:
1. Finds `[BOOKING_SUMMARY]...[/BOOKING_SUMMARY]` in the reply
2. Parses the JSON, extracts `delivery_window_start`/`delivery_window_end`
3. Converts to Oslo time using `toLocaleString('nb-NO', { timeZone: 'Europe/Oslo' })`
4. Overwrites the `time` field with the localized range (e.g., "09:00--12:00")
5. Also fixes the `date` field to Oslo locale if it looks like raw ISO

## Issue 3: Cancel booking missing from ACTION_MENU

**Root cause**: When the AI generates its own `[ACTION_MENU]...[/ACTION_MENU]`, `patchActionMenu` sees `hasCompleteActionMenu = true` at line 664 and returns early without checking if all required options are present. The cancel option gets dropped.

**Fix**: Instead of returning early when a complete ACTION_MENU exists, validate its contents. If "Avbestille" / "cancel" is missing, replace the AI-generated menu with the standard 5-option menu.

## Bonus: Multiple bookings should be shown for edit flows

**Current**: `patchBookingInfo` only grabs `bookings[0]` from tool results. If the customer has 2+ active bookings and wants to edit one, they should see all bookings and choose.

**Fix**: When `toolResult.bookings` has more than 1 entry AND the user's intent is an edit flow (change_time, change_address, etc.), present an `[ACTION_MENU]` listing each booking as an option (e.g., "Dekkskift - 18. feb, Holtet 45" / "Vask - 20. feb, Kongens gate 5") instead of auto-selecting the first one.

---

## Technical Details

### File: `supabase/functions/widget-ai-chat/index.ts`

**Change 1 -- Flow-driven system prompt (lines 1576-1588)**

Replace the hardcoded "mention upcoming bookings" instruction with:

```
After looking up the customer:
- Greet them by name.
- Check which action flow matches their stated intent.
- If a flow is matched (e.g., new_booking), proceed DIRECTLY to its first step. Do NOT mention or reference existing bookings unless the flow requires a booking lookup step.
- If NO flow is matched and the customer hasn't stated an intent, briefly mention if they have upcoming bookings, then ask what they'd like help with.
- NEVER list stored addresses or vehicles as text. The interactive blocks handle display.
- IMPORTANT: You ALREADY KNOW whether this is an existing customer. NEVER ask "have you ordered before?".
```

**Change 2 -- Extract addresses from user_groups (line ~1144)**

After the existing `storedAddresses` extraction from bookings, add:

```typescript
// Also extract addresses from user_groups (broader coverage)
for (const group of userGroups) {
  if (Array.isArray(group.addresses)) {
    for (const addr of group.addresses) {
      if (addr?.id && !storedAddresses.has(addr.id)) {
        const label = `${addr.street_name || ''} ${addr.street_number || ''}, ${addr.zip_code || ''} ${addr.city || ''}`.replace(/\s+/g, ' ').trim().replace(/^,|,$/g, '').trim();
        storedAddresses.set(addr.id, {
          id: addr.id,
          full_address: label,
          street: addr.street_name || '',
          city: addr.city || '',
          zip: addr.zip_code || '',
        });
      }
    }
  }
}
```

**Change 3 -- New `patchBookingSummaryTime` post-processor**

```typescript
function patchBookingSummaryTime(reply: string): string {
  const re = /\[BOOKING_SUMMARY\]([\s\S]*?)\[\/BOOKING_SUMMARY\]/;
  const m = reply.match(re);
  if (!m) return reply;
  try {
    const data = JSON.parse(m[1].trim());
    const dwStart = data.delivery_window_start;
    const dwEnd = data.delivery_window_end;
    if (dwStart && dwEnd) {
      const startD = new Date(dwStart);
      const endD = new Date(dwEnd);
      if (!isNaN(startD.getTime()) && !isNaN(endD.getTime())) {
        const fmt = (d) => d.toLocaleString('nb-NO', {
          timeZone: 'Europe/Oslo',
          hour: '2-digit', minute: '2-digit', hour12: false
        });
        data.time = `${fmt(startD)}\u2013${fmt(endD)}`;
      }
    }
    if (dwStart && (!data.date || /^\d{4}-\d{2}-\d{2}/.test(data.date))) {
      const d = new Date(dwStart);
      data.date = d.toLocaleDateString('nb-NO', {
        timeZone: 'Europe/Oslo',
        year: 'numeric', month: '2-digit', day: '2-digit'
      });
    }
    return reply.replace(re, `[BOOKING_SUMMARY]${JSON.stringify(data)}[/BOOKING_SUMMARY]`);
  } catch { return reply; }
}
```

Add to pipeline at line 2108, before `patchBookingEdit`.

**Change 4 -- Fix `patchActionMenu` to validate existing menus (line 664)**

Replace the early return:

```typescript
if (hasCompleteActionMenu) {
  const menuMatch = reply.match(/\[ACTION_MENU\]([\s\S]*?)\[\/ACTION_MENU\]/);
  const menuContent = menuMatch?.[1] || '';
  const hasCancel = /avbestill|kanseller|cancel/i.test(menuContent);
  if (hasCancel) return reply; // Menu is complete with all options
  // Menu is missing cancel -- replace with standard set
  const fullMenu = `[ACTION_MENU]\nEndre tidspunkt\nEndre adresse\nEndre bil\nLegg til tjenester\nAvbestille bestilling\n[/ACTION_MENU]`;
  return reply.replace(/\[ACTION_MENU\][\s\S]*?\[\/ACTION_MENU\]/, fullMenu);
}
```

**Change 5 -- Handle multiple bookings in `patchBookingInfo` (line 504-512)**

When `toolResult.bookings` has 2+ entries, instead of grabbing `bookings[0]`, inject an `[ACTION_MENU]` listing all bookings so the customer can choose:

```typescript
if (toolResult.bookings && toolResult.bookings.length > 1) {
  // Multiple bookings -- let customer choose
  const options = toolResult.bookings.map((b) => {
    const svc = (b.services?.[0] || 'Bestilling');
    const date = b.scheduledAt?.split(',')[0] || '';
    const addr = b.address || '';
    return `${svc} - ${date}${addr ? ', ' + addr : ''} (ID: ${b.id})`;
  });
  const menuMarker = `Du har ${toolResult.bookings.length} aktive bestillinger. Hvilken gjelder det?\n\n[ACTION_MENU]\n${options.join('\n')}\n[/ACTION_MENU]`;
  return menuMarker;
}
```

### Deploy
Re-deploy `widget-ai-chat` edge function.

## Expected Results
1. New booking flow goes straight to ADDRESS_SEARCH with all stored addresses (not just from booking history)
2. BOOKING_SUMMARY card shows Oslo-localized time (e.g., "09:00--12:00" in CET)
3. ACTION_MENU always includes "Avbestille bestilling"
4. When a customer has 2+ active bookings, they're asked which one to edit
