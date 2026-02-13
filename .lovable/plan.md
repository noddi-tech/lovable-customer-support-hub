

# Add User-Friendly Fallback for Noddi SMS API 500 Errors

## Problem

When the Noddi SMS API returns a 500 error, the widget shows a raw technical error message like "Failed to send verification code" with debug details. This is confusing for end users.

## Solution

Two small changes to catch server errors and display a friendly message:

### File 1: `src/widget/api.ts` (line ~263-271)

In the `sendPhoneVerification` function, detect when the error response contains a 500-level status or "server_error" in the body, and return a user-friendly message instead of the raw error:

```typescript
export async function sendPhoneVerification(...) {
  try {
    const response = await fetch(...);
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      // If the upstream API returned a server error, show a friendly message
      if (response.status >= 500 || errorData.debug_status >= 500) {
        return { success: false, error: 'Verification is temporarily unavailable, please try again later' };
      }
      return { success: false, error: errorData.error || 'Failed to send code' };
    }
    return { success: true };
  } catch ...
}
```

### File 2: `src/widget/components/blocks/PhoneVerifyBlock.tsx` (line 60)

No changes needed -- it already displays `result.error` to the user, so the friendly message from the API layer will flow through automatically.

## Summary

One change in `src/widget/api.ts`: add a check for 500-level responses and return a human-readable error string. The widget UI already displays this string, so no UI changes are required.

