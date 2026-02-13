

# Fix: Booking Edit Not Actually Updating (Wrong Dates in Payload)

## Problem

The widget shows "Booking updated!" but the booking is unchanged in Noddi's system. Root cause:

1. The user selected a new time for **Feb 19** (delivery_window_id 672, start 2026-02-19T06:00:00Z, end 2026-02-19T11:00:00Z)
2. The AI emitted `[BOOKING_EDIT]` with only `delivery_window_id: 672` but no start/end timestamps
3. The client-side localStorage recovery found delivery_window_id 672 but matched an **older entry with Feb 16 dates** (the original booking time)
4. The PATCH went through with the old dates, so the Noddi API returned 200 -- effectively a no-op

## Solution: Server-side patching of BOOKING_EDIT (same pattern as patchBookingSummary)

Add a `patchBookingEdit` function that runs on the AI's final reply before it reaches the client. This function:

1. Finds `[BOOKING_EDIT]...[/BOOKING_EDIT]` in the reply
2. Parses the JSON inside
3. If `delivery_window_id` is present but `delivery_window_start` or `delivery_window_end` is missing, scans the conversation history for the user's time slot selection (the JSON message containing `delivery_window_id`, `start_time`, `end_time`)
4. Injects the correct start/end times into the marker JSON

This eliminates reliance on the AI including these fields and on localStorage (which can have stale entries).

## Changes

### File: `supabase/functions/widget-ai-chat/index.ts`

**A) Add `patchBookingEdit` function** (near `patchBookingSummary`, ~line 402):

```typescript
function patchBookingEdit(reply: string, messages: any[]): string {
  const marker = '[BOOKING_EDIT]';
  const closingMarker = '[/BOOKING_EDIT]';
  const startIdx = reply.indexOf(marker);
  const endIdx = reply.indexOf(closingMarker);
  if (startIdx === -1 || endIdx === -1) return reply;

  const jsonStr = reply.slice(startIdx + marker.length, endIdx);
  let editData: any;
  try { editData = JSON.parse(jsonStr); } catch { return reply; }

  const changes = editData.changes || {};
  if (!changes.delivery_window_id) return reply;
  if (changes.delivery_window_start && changes.delivery_window_end) return reply;

  // Scan conversation for the most recent time slot selection matching this window ID
  for (let i = messages.length - 1; i >= 0; i--) {
    const msg = messages[i];
    if (msg.role !== 'user' || typeof msg.content !== 'string') continue;
    try {
      const sel = JSON.parse(msg.content);
      if (sel.delivery_window_id == changes.delivery_window_id && sel.start_time && sel.end_time) {
        changes.delivery_window_start = sel.start_time;
        changes.delivery_window_end = sel.end_time;
        editData.changes = changes;
        const patched = reply.slice(0, startIdx) + marker + JSON.stringify(editData) + closingMarker + reply.slice(endIdx + closingMarker.length);
        console.log('[patchBookingEdit] Injected start/end from conversation:', sel.start_time, sel.end_time);
        return patched;
      }
    } catch { /* not JSON */ }
  }
  return reply;
}
```

**B) Call `patchBookingEdit` on the final reply** (~line 1264, after `patchBookingSummary`):

```typescript
const rawReply = assistantMessage.content || '...';
let reply = await patchBookingSummary(rawReply, currentMessages, visitorPhone, visitorEmail);
reply = patchBookingEdit(reply, currentMessages);
```

This ensures the `[BOOKING_EDIT]` marker always contains the correct, conversation-sourced timestamps before the client renders it.

## Why this is better than client-side recovery

- localStorage can contain stale entries from previous sessions with the same delivery_window_id
- The conversation history is the single source of truth for the current session's time slot selection
- Mirrors the proven `patchBookingSummary` pattern already in use

## Scope

| File | Change |
|------|--------|
| `supabase/functions/widget-ai-chat/index.ts` | Add `patchBookingEdit` function; call it on final reply alongside `patchBookingSummary` |

