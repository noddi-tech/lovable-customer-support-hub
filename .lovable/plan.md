

# Blank Preview -- Diagnosis and Fix

## What's happening

The dev server is running correctly (HTTP 200, no errors in logs, serves valid HTML). The blank screen is caused by the **Lovable preview proxy** failing to relay requests to the dev server. The only console errors are WebSocket HMR connection failures -- no 503s on source files this time, which means the proxy is completely unresponsive rather than partially failing.

This has been happening repeatedly after Git syncs and edge function deployments. It is **not a code bug**.

## Immediate fix

**Refresh the preview** using the reload button in the preview toolbar (the circular arrow icon next to the URL bar). If that doesn't work, navigate away and back, or open the published URL directly:
`https://lovable-customer-support-hub.lovable.app`

If the published URL works, the app code is confirmed correct and the issue is purely the preview proxy connection.

## No code changes needed

There is no code change that will fix this. The dev server (`localhost:8080`) responds with 200 and serves the correct HTML. The proxy layer between the preview iframe and the dev server is what's failing.

