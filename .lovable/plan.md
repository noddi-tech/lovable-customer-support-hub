
# Fix Edge Functions to Match Noddi API Schema

## Problem

After reviewing the uploaded Noddi OpenAPI schema, the current edge functions have a mismatch with the actual API contract:

### 1. `widget-send-verification` -- Missing Required `domain` Field

The Noddi `/v1/users/send-phone-number-verification-v2/` endpoint requires **two fields**:
- `phone_number` (string) -- currently sent
- `domain` (string) -- **NOT currently sent** (required!)

Without `domain`, the API call will fail with a 400 error. The `domain` field determines the SMS sender name/branding.

### 2. `widget-verify-phone` -- Field Name Confirmation

The `/v1/users/verify-phone-number/` endpoint expects:
- `phone_number` (string) -- currently sent correctly
- `code` (string) -- currently sent correctly as `code: pin`

This is already correct. The response returns `{ token, user }` (both nullable). A successful response (HTTP 201) means verification passed. A non-existent user returns `{ token: null, user: null }` but the verification itself succeeded.

## Changes

### File: `supabase/functions/widget-send-verification/index.ts`

Add the `domain` field to the Noddi API request body. The domain should be passed from the widget frontend or default to `"noddi.no"`.

- Accept an optional `domain` field in the request JSON
- Pass it to Noddi: `{ phone_number: cleanPhone, domain: domain || "noddi.no" }`

### File: `supabase/functions/widget-verify-phone/index.ts`

Minor improvement: handle the case where verification succeeds (HTTP 201) but the user doesn't exist in Noddi (token/user are null). The phone number is still verified -- we should still mark the conversation as verified.

No structural changes needed since the `code` and `phone_number` fields already match the schema.

### File: `src/widget/api.ts`

No changes needed -- the API helper functions are already correct.

## Summary

| File | Change |
|------|--------|
| `supabase/functions/widget-send-verification/index.ts` | Add required `domain` field to Noddi API request |
| `supabase/functions/widget-verify-phone/index.ts` | Handle null user/token response on successful verification |
