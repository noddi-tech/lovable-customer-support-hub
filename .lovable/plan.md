
# Add Friendly Error Messages for All 500 Errors Across the Widget

## Overview

Apply the same user-friendly "temporarily unavailable" pattern used in phone verification to every API call in the widget that can encounter a server error (500+).

## Changes

### 1. `src/widget/api.ts` -- 4 functions updated

**`submitContactForm`** (line 45-47): Add 500 check before the generic error return.

**`sendAiMessage`** (line 174-176): Instead of throwing a raw error on 500, throw a friendly message.

**`verifyPhonePin`** (line 288-294): Add 500 check -- return `{ verified: false, error: 'Verification is temporarily unavailable, please try again later' }`.

**`resolveAddress`** (line 346): Instead of `throw new Error('Failed to resolve address')`, check status and throw a friendly message for 500s.

### 2. `src/widget/components/blocks/BookingSummaryBlock.tsx` (lines 97-121)

- Line 103-104: Check `resp.status >= 500` before using `bookingData.error`. Show: **"Booking is temporarily unavailable, please try again later"**
- Line 120-121: Change the catch `'Network error'` to **"Something went wrong, please try again later"**

### 3. `src/widget/components/blocks/LicensePlateBlock.tsx` (lines 36-46)

- Line 43-44: Check `resp.status >= 500` before using `result.error`. Show: **"Vehicle lookup is temporarily unavailable, please try again later"**

### 4. `src/widget/components/blocks/BookingEditConfirmBlock.tsx` (lines 36-59)

- Line 43-44: Check `resp.status >= 500` before using `respData.error`. Show: **"Booking update is temporarily unavailable, please try again later"**
- Line 58-59: Change `'Network error'` to **"Something went wrong, please try again later"**

### 5. `src/widget/components/AiChat.tsx` (line 209)

- Change the catch-all error message `t.aiError` to also cover 500s gracefully (already uses a translation key -- just confirming it stays friendly).

## Pattern

Every API error handler gets this check inserted before the generic fallback:

```typescript
if (resp.status >= 500) {
  setError('Service is temporarily unavailable, please try again later');
  return;
}
```

This ensures users never see raw technical errors like "Failed to create booking" or "502" when the Noddi API is having issues.
