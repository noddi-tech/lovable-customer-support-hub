
# Fix: Send Complete Request Body to Noddi Verification API

## Root Cause

The API schema (from the screenshot) shows the request body requires **all 6 fields**, not just `phone_number` and `domain`. We're only sending 2 fields, which causes the `400` validation error. The API expects:

```json
{
  "botd_request_id": null,
  "captcha_token": null,
  "device_fingerprint": null,
  "domain": "noddi",
  "force_send": false,
  "phone_number": "string"
}
```

Also, the domain example value is `"noddi"` (not `"noddi.no"`), and there's a bug where `resp.text()` is called before `resp.json()` -- consuming the body twice.

## Changes

### File: `supabase/functions/widget-send-verification/index.ts`

1. **Send all required fields** in the request body, including `botd_request_id: null`, `captcha_token: null`, `device_fingerprint: null`, and `force_send: false`
2. **Change domain** from `"noddi.no"` to `"noddi"` to match the API's expected format
3. **Fix response parsing bug**: parse `respText` with `JSON.parse()` instead of calling `resp.json()` (which fails since body was already consumed by `resp.text()`)

### Technical Detail

```text
Before:
  body: { phone_number, domain }  -->  400 "Expected a string"

After:
  body: {
    botd_request_id: null,
    captcha_token: null,
    device_fingerprint: null,
    domain: "noddi",
    force_send: false,
    phone_number: "+4741354569"
  }  -->  201 success
```

Redeploy the `widget-send-verification` edge function after the change.
