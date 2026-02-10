

# Fix Customer Lookup + Improve Phone/OTP Input UI

## Two Issues to Solve

### Issue 1: Customer lookup returns 403 (permission_denied)

The edge function logs reveal the real problem:

```
[lookup] Noddi API error for phone +4741354569: 403 {"type": "client_error", "errors": [{"code": "permission_denied", ...}]}
```

The `widget-ai-chat` function uses `/v1/users/get-by-phone-number/` which the API token does NOT have permission for. Meanwhile, the working `noddi-customer-lookup` function uses a different endpoint: `/v1/users/customer-lookup-support/` -- which the token DOES have access to.

**Fix**: Change `executeLookupCustomer` in `widget-ai-chat/index.ts` to use the same `/v1/users/customer-lookup-support/` endpoint that already works in `noddi-customer-lookup`.

### Issue 2: Improve phone number and PIN input UX

Replace the plain text inputs with proper styled components:
- **Phone number**: A styled input matching the shadcn Input component design (rounded border, proper focus ring, clean appearance)
- **PIN/OTP code**: A 6-digit OTP-style input with individual digit boxes, matching the shadcn InputOTP pattern

Since this is a standalone widget (not part of the main app bundle), we cannot import shadcn components directly. Instead, we will replicate the visual style in the widget's own CSS and HTML structure.

## Changes

### File: `supabase/functions/widget-ai-chat/index.ts`

**Change the customer lookup endpoint** from:
```
/v1/users/get-by-phone-number/?phone_number=...
```
to:
```
/v1/users/customer-lookup-support/?phone=...
```

Also update the email lookup to use the same endpoint:
```
/v1/users/customer-lookup-support/?email=...
```

The response format from `customer-lookup-support` may differ from `get-by-phone-number`. We will parse the response to extract user data and user_group_id, matching how `noddi-customer-lookup` handles it.

### File: `src/widget/components/AiChat.tsx`

**Phone input step**: Replace the plain `<input type="tel">` with a properly styled input that looks like the shadcn Input component -- with rounded corners, border, focus ring, and a country code prefix (+47).

**PIN input step**: Replace the single text input with 6 individual digit boxes (OTP-style), where:
- Each box accepts exactly one digit
- Focus auto-advances to the next box on input
- Backspace moves focus to the previous box
- The component is built as a simple inline implementation (no external OTP library needed for the widget)

### File: `src/widget/styles/widget.css`

Add CSS styles for:
- `.noddi-phone-input` -- styled to match shadcn Input (rounded-md, border, focus ring)
- `.noddi-otp-container` -- flex container for the 6 OTP digit boxes
- `.noddi-otp-slot` -- individual digit box (centered text, border, focus highlight)
- `.noddi-otp-separator` -- visual dot separator between groups of 3

## Summary

| File | Change |
|------|--------|
| `supabase/functions/widget-ai-chat/index.ts` | Switch to `/v1/users/customer-lookup-support/` endpoint (fixes 403) |
| `src/widget/components/AiChat.tsx` | Styled phone input + 6-digit OTP input UI |
| `src/widget/styles/widget.css` | Add Input and InputOTP-style CSS for the widget |

