
# Fix: SendgridWebhookFixer crash on null diagnostics

## Problem

When expanding the "Domain Setup (SendGrid)" section, the `SendgridWebhookFixer` component crashes with `Cannot read properties of null (reading 'environment')`. The diagnostics data is fetched asynchronously, but the render code accesses `diagnostics.environment` before checking if `diagnostics` is null.

## Fix

**File: `src/components/admin/SendgridWebhookFixer.tsx`**

Swap the condition order on the line that checks for missing inbound token (around line 211):

From:
```
{!diagnostics.environment?.hasInboundToken && diagnostics && (
```

To:
```
{diagnostics && !diagnostics.environment?.hasInboundToken && (
```

This ensures `diagnostics` is checked for null first, before accessing its `environment` property. A one-line fix.
