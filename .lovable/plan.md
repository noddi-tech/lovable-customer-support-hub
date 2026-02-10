

# Fix: Use GET with Query Parameters for Noddi Verification

## Root Cause

The working noddi.no site reveals the actual API contract:

- **Method**: `GET` (not POST)
- **URL**: `/v1/users/send-phone-number-verification/` (not the `-v2/` variant)
- **Parameters**: passed as **query parameters** (`?domain=noddi&phone_number=%2B4741354569`)

We have been sending POST requests with a JSON body to the wrong endpoint this entire time. That is why every strategy returned `400 "Expected a string" attr: "body"` -- the `-v2/` endpoint expects POST, but may have different auth requirements, while the non-v2 endpoint is a simple GET.

## Changes

### File: `supabase/functions/widget-send-verification/index.ts`

1. **Change the Noddi API URL** from `/v1/users/send-phone-number-verification-v2/` to `/v1/users/send-phone-number-verification/`
2. **Change HTTP method** from `POST` to `GET`
3. **Pass parameters as query string** (`domain` and `phone_number`) instead of a JSON body
4. **Remove all the retry strategies** (strategies 2-4) since they are no longer needed
5. **Keep the Authorization header** with the API token
6. **Keep rate limiting and widget validation** logic unchanged

### Technical Detail

```text
Before (broken):
  POST /v1/users/send-phone-number-verification-v2/
  Body: { phone_number, domain, ... }
  -> 400 validation error

After (matches working noddi.no):
  GET /v1/users/send-phone-number-verification/?domain=noddi&phone_number=%2B4741354569
  -> 200 OK
```

### Deployment

Redeploy the `widget-send-verification` edge function after the change.

