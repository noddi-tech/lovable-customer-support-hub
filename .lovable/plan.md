

# Fix: Debug and Resolve Noddi Verification 400 Error

## Analysis

The JSON body being sent is well-formed and includes all 6 required fields. The `widget-verify-phone` function (which calls a similar Noddi endpoint) works fine with the same auth pattern. Two potential root causes remain:

1. **Redirect body-loss**: Django APIs commonly redirect between trailing-slash and non-trailing-slash URLs via HTTP 301. When this happens, most HTTP clients (including Deno's fetch) follow the redirect but change POST to GET, **dropping the request body**. The server then receives an empty body and returns a validation error. This could explain the odd `"attr": "body"` error.

2. **Missing first-response logging**: We never see the JSON attempt's response -- only the form-encoded retry. The first response could contain different/more useful error details.

## Changes

### File: `supabase/functions/widget-send-verification/index.ts`

1. **Disable automatic redirect following** by adding `redirect: "manual"` to the fetch options. This prevents body loss from silent 301/302 redirects. If a redirect is detected, manually re-issue the POST to the new Location URL with the body intact.

2. **Log the first JSON response** before retrying as form-encoded, so we can see exactly what the API returns for the JSON attempt.

3. **Try the URL without trailing slash** as a fallback, since the redirect between `/send-phone-number-verification-v2/` and `/send-phone-number-verification-v2` could be the issue.

4. **Add a `User-Agent` header** -- some API gateways reject requests without one.

### Technical Detail

```text
Current flow:
  POST /v1/users/send-phone-number-verification-v2/
    -> possible 301 redirect to non-slash URL
    -> fetch follows redirect as GET (body dropped)
    -> API sees empty body -> 400 "Expected a string"

Fixed flow:
  POST /v1/users/send-phone-number-verification-v2/
    redirect: "manual"
    -> if 301/302: re-POST to Location header with body
    -> if 400: log response, retry as form-encoded
    -> if success: return result
```

### Deployment

Redeploy the `widget-send-verification` edge function after the change.

