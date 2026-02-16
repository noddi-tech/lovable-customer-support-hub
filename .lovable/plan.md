

# Fix: Cancel Booking Endpoint and YES_NO Display

## Root Causes

### Issue 1: Cancellation fails with "booking_id is required"
The edge function logs show:
```
Cancel failed: 400 {"type": "validation_error", "errors": [{"code": "required", "detail": "This field is required.", "attr": "booking_id"}]}
```

The `executeCancelBooking` function sends a PATCH request to `/v1/bookings/{id}/cancel/` with `booking_id` as a query parameter, but the Noddi API expects `booking_id` in the **request body**. The PATCH request currently sends no body at all.

Current code (line 1583-1588):
```typescript
const url = new URL(`${API_BASE}/v1/bookings/${bookingId}/cancel/`);
url.searchParams.set('booking_id', String(bookingId));
const resp = await fetch(url.toString(), {
  method: 'PATCH',
  headers: { ... },
  // NO BODY!
});
```

### Issue 2: Raw `[YES_NO]` markers visible as text
The AI outputs something like:
```
Du har valgt a kansellere begge bestillingene. Vennligst bekreft...

Du onsker a kansellere begge bestillingene. [YES_NO]Er du sikker?[/YES_NO]
```

The parser correctly splits this into a text block + a YES_NO component block, but the user sees BOTH: the introductory text AND the YES_NO component below it. The user wants only the YES_NO component with the full question inside it, no surrounding prose. The `patchYesNo` post-processor skips because `[YES_NO]` already exists in the reply (the AI put it there). The result is redundant text above the component.

---

## Changes

### 1. Fix `executeCancelBooking` -- send `booking_id` in request body

**File**: `supabase/functions/widget-ai-chat/index.ts`, lines 1582-1589

Send `booking_id` and `notify_customer` in the JSON body instead of (or in addition to) query params:

```typescript
async function executeCancelBooking(bookingId: number, reason?: string): Promise<string> {
  const noddiToken = Deno.env.get('NODDI_API_TOKEN');
  if (!noddiToken) return JSON.stringify({ error: 'Booking modification not configured' });

  try {
    const resp = await fetch(`${API_BASE}/v1/bookings/${bookingId}/cancel/`, {
      method: 'PATCH',
      headers: {
        'Authorization': `Token ${noddiToken}`,
        'Accept': 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        booking_id: bookingId,
        notify_customer: true,
      }),
    });

    if (!resp.ok) {
      const errorBody = await resp.text();
      console.error('[widget-ai-chat] Cancel failed:', resp.status, errorBody);
      if (resp.status === 404) return JSON.stringify({ success: false, error: 'Booking not found' });
      if (resp.status === 400) return JSON.stringify({ success: false, error: 'This booking cannot be cancelled. It may already be completed or cancelled.' });
      return JSON.stringify({ success: false, error: 'Cancellation failed. Please contact support.' });
    }

    return JSON.stringify({ success: true, message: 'Booking cancelled successfully' });
  } catch (err) {
    console.error('[widget-ai-chat] Cancel error:', err);
    return JSON.stringify({ success: false, error: 'Cancellation failed' });
  }
}
```

### 2. Clean up redundant text when `[YES_NO]` is already present

**File**: `supabase/functions/widget-ai-chat/index.ts`, in `patchYesNo` function (line 406-468)

Instead of immediately returning when `[YES_NO]` is already present, strip out the surrounding prose so only the `[YES_NO]...[/YES_NO]` block remains (keeping a short lead-in if needed):

```typescript
function patchYesNo(reply: string, messages?: any[]): string {
  // If AI already included [YES_NO], clean up: keep ONLY the [YES_NO] block
  if (reply.includes('[YES_NO]') && reply.includes('[/YES_NO]')) {
    const match = reply.match(/\[YES_NO\]([\s\S]*?)\[\/YES_NO\]/);
    if (match) {
      // Return ONLY the YES_NO block -- strip all surrounding text
      return `[YES_NO]${match[1]}[/YES_NO]`;
    }
    return reply;
  }

  // ... rest of existing patchYesNo logic unchanged ...
}
```

This ensures that when the AI outputs `"Du onsker a kansellere... [YES_NO]Er du sikker?[/YES_NO]"`, the post-processor strips the surrounding text and returns only `[YES_NO]Er du sikker?[/YES_NO]`.

---

## File Changes Summary

| File | Change |
|------|--------|
| `supabase/functions/widget-ai-chat/index.ts` | 1) Fix `executeCancelBooking` to send `booking_id` in the request body 2) Update `patchYesNo` to strip surrounding text when `[YES_NO]` markers already exist |

## Expected Results
1. Cancel requests succeed -- `booking_id` is sent in the PATCH body as the API expects
2. YES_NO confirmation shows ONLY the interactive component with the question inside, no redundant text above it

