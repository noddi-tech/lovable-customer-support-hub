

# Fix: Three Issues in Booking Edit Flow

## Issue 1: Forced-Text Recovery Call Returns 400

**Root Cause**: The final recovery call sends `tool_choice: "none"` but does NOT include the `tools` array. OpenAI API requires `tools` to be present when `tool_choice` is specified.

**Error from logs**:
```
"Invalid value for 'tool_choice': 'tool_choice' is only allowed when 'tools' are specified."
```

**Fix**: In the forced-text recovery call (around line 1535), include the `tools` array in the request body alongside `tool_choice: "none"`.

```typescript
body: JSON.stringify({
  model: 'gpt-4o-mini',
  messages: currentMessages,
  tools,                    // <-- ADD THIS
  tool_choice: 'none',
  temperature: 0.7,
  max_tokens: 1024,
  stream: false,
}),
```

This is the critical fix -- every previous recovery attempt has been silently failing because of this one missing field.

---

## Issue 2: AI Asks Confirmation as Plain Text Instead of [YES_NO]

**Problem**: When the AI asks "Er dette bestillingen du onsker a endre?", it uses plain text instead of the `[YES_NO]` marker (visible in screenshot 3).

**Fix**: Strengthen the system prompt instruction (around line 1050) to be even more explicit and add an example. Also add a post-processing step that detects common confirmation patterns and wraps them in `[YES_NO]`.

Add to system prompt after line 1050:
```
Example: Instead of writing "Er dette bestillingen du onsker a endre?" as plain text, write:
[YES_NO]Er dette bestillingen du onsker a endre?[/YES_NO]
```

Add a `patchYesNo` post-processor that catches common Norwegian/English confirmation phrases and wraps them in `[YES_NO]` markers if missing. Apply it alongside the existing `patchBookingSummary` and `patchBookingEdit` calls.

---

## Issue 3: Crash After Selecting New Time Slot

**Problem**: After the user selects a new time from `[TIME_SLOT]`, the AI tries to call `update_booking` or `get_booking_details` again, exhausting the loop and hitting the same broken recovery path (which is fixed by Issue 1 above).

**Fix**: Issue 1's fix (adding `tools` to the recovery call) will resolve this crash too, since the recovery call will now succeed and the AI will produce the `[BOOKING_EDIT]` marker. No additional changes needed for this specific case.

---

## Summary of Changes

### File: `supabase/functions/widget-ai-chat/index.ts`

| Change | Location | Description |
|--------|----------|-------------|
| Add `tools` to recovery call | ~line 1538 | Include `tools` array so `tool_choice: "none"` is accepted |
| Strengthen YES_NO prompt | ~line 1050 | Add explicit example of YES_NO usage for booking confirmation |
| Add `patchYesNo` post-processor | New function + lines ~1455, ~1556 | Auto-wrap plain-text confirmation questions in [YES_NO] markers |

### Deploy
Re-deploy `widget-ai-chat` edge function.

## Expected Result

1. "Endre tid" button click: Recovery call succeeds, AI emits [TIME_SLOT] marker
2. Booking confirmation: Uses [YES_NO] interactive component
3. After time slot selection: Recovery call succeeds, AI emits [BOOKING_EDIT] marker
