

# Fix: Phone Number Missing Country Code Prefix

## Root Cause

The booking confirmation fails because the verified phone number is stored **without** the `+47` country code prefix.

In `PhoneVerifyBlock.tsx` (line 75), the phone is saved as-is from the input field:
```
localStorage.setItem(VERIFIED_PHONE_KEY, phone);  // "41354569"
```

But the `+47` is only a visual label in the UI (`<span className="noddi-phone-prefix">+47</span>`), not part of the input value. This means:

1. **Server-side**: `visitorPhone` is sent as `"41354569"` to `widget-ai-chat`, which passes it to `patchBookingSummary` -> `executeLookupCustomer`. Noddi API can't find the customer.
2. **Client-side fallback**: `BookingSummaryBlock` reads the same phone from localStorage and calls `lookup_customer` with `"41354569"` -- also fails with "Customer not found".
3. Result: `user_id` and `user_group_id` remain missing, and booking creation returns 400.

## Fix

### PhoneVerifyBlock.tsx -- Prepend +47 when storing the phone

When saving the verified phone to localStorage and passing it to `onAction`, prepend `+47` if the number doesn't already start with `+`:

**File**: `src/widget/components/blocks/PhoneVerifyBlock.tsx` (lines 72-78)

Change:
```typescript
const phone = phoneInput.trim();
```
To:
```typescript
let phone = phoneInput.trim();
if (!phone.startsWith('+')) {
  phone = '+47' + phone;
}
```

This ensures:
- localStorage stores `"+4741354569"`
- `onAction` sends `"+4741354569"` to the chat
- `visitorPhone` in the edge function is `"+4741354569"`
- Both server-side and client-side customer lookups succeed
- Booking creation gets the required `user_id` and `user_group_id`

This is a 3-line change in one file.
