

# Fix: Show hostname in MX record display

## Problem

When the SendGrid setup returns `ok: false` (sender auth required), the API response omits the `hostname` field. The UI at line 242 of `SendgridSetupWizard.tsx` renders `{result.hostname}` which is undefined, so the Host field appears blank.

## Fix

**File: `src/components/admin/SendgridSetupWizard.tsx`**

On line 242, add a fallback that computes the hostname from the form values when `result.hostname` is missing:

Change:
```
<span>{result.hostname}</span>
```

To:
```
<span>{result.hostname || `${form.getValues().parse_subdomain}.${form.getValues().domain}`}</span>
```

This ensures the MX Host always shows (e.g. `inbound.dekkfix.no`) regardless of whether the API included it in the response.

**File: `supabase/functions/sendgrid-setup/index.ts`**

Also add `hostname` to the error response (around line 126-133) so future responses always include it:

Add `hostname,` to the `ok: false` response object.

