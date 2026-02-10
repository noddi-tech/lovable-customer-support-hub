
# Fix OTP Input Issues and Add Post-Verification Auto-Lookup

## Problem 1: OTP Input Error on First Submit

The OTP input has a race condition. When typing digits quickly, each slot's `onChange` does `pinInput.split('')`, sets a character at index `i`, and calls `setPinInput`. But React state updates are asynchronous -- if you type digit 5 and digit 6 quickly, the second onChange may still see the old `pinInput` without digit 5, causing it to be lost.

Additionally, the auto-submit (`handleVerifyPin()`) on the 6th digit (line 478) fires via `setTimeout(..., 100)` before the state has settled, potentially sending an incomplete PIN.

### Fix
- Use a `ref` alongside state to track the PIN value synchronously, so each onChange always reads the latest value.
- Move auto-submit to a `useEffect` that watches `pinInput` length, ensuring it only fires after state has fully updated.
- Make sure both OTP groups (slots 0-2 and 3-5) use identical logic for cross-group navigation.

## Problem 2: Post-Verification Auto-Lookup

Currently, after successful phone verification, the widget only shows a "Telefon verifisert" badge. The AI doesn't automatically look up the customer -- it waits for the user to type something.

### Fix
After verification succeeds in `handleVerifyPin`, automatically send a system-initiated message to the AI (e.g., "Telefonnummeret mitt er verifisert. Kan du slå opp kontoen min?") so the AI immediately calls `lookup_customer` with the verified phone and proactively presents the customer's account data (vehicles, upcoming bookings, etc.).

This aligns with the existing system prompt which says: "After looking up the customer, proactively check for upcoming orders, wheel storage, etc."

## Changes

### File: `src/widget/components/AiChat.tsx`

1. **Fix OTP race condition**: Add a `pinRef` (useRef) that mirrors `pinInput` synchronously. Each onChange writes to the ref first, then sets state. Auto-submit reads from the ref.

2. **Auto-lookup after verification**: In `handleVerifyPin`, after setting verified state, automatically inject a user message like "Telefonnummeret mitt er verifisert, kan du slå opp kontoen min?" and call the AI send flow. This triggers the AI to use `lookup_customer` with the verified phone and proactively present account data (vehicles, bookings).

3. **Cross-group navigation fix**: Ensure backspace from slot 3 focuses slot 2 (across the separator), and forward from slot 2 focuses slot 3.

### File: `supabase/functions/widget-ai-chat/index.ts`

No changes needed -- the system prompt already instructs the AI to proactively look up and present customer data when verified. The auto-message just triggers this existing behavior.

## Technical Detail

```text
Current post-verification flow:
  User verifies phone -> Badge shown -> User must type something -> AI looks up account

New post-verification flow:
  User verifies phone -> Badge shown -> Auto-message sent -> AI calls lookup_customer 
  -> AI presents: "Hi [Name]! I found your account. You have [bookings]. Which car would you like to book for?"
```

## Deployment

No edge function changes needed. Only the widget component (`AiChat.tsx`) is modified.
