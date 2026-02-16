

# Fix: Support Multiple Domains (noddi.no + dekkfix.no)

## Current Situation

The code changes from the last fix are correct -- the wizard now tries to match the domain from the email input. However, `dekkfix.no` doesn't exist in the `email_domains` database table. Only `noddi.no` is configured. So `getDomainByName('dekkfix.no')` returns nothing, and it falls back to `noddi.no`.

The alert misleadingly says "Domain **noddi.no** is configured and ready!" even though the user typed `hei@dekkfix.no`.

## Plan

### 1. Add `dekkfix.no` domain to the database

Insert a new `email_domains` record for `dekkfix.no` with the same organization, using `inbound` as the parse subdomain (same pattern as noddi.no):

```sql
INSERT INTO email_domains (domain, parse_subdomain, organization_id, provider, status)
VALUES ('dekkfix.no', 'inbound', 'b9b4df82-2b89-4a64-b2a3-5e19c0e8d43b', 'sendgrid', 'pending');
```

**Note:** After adding this, you'll also need to configure the DNS records for `dekkfix.no` (MX record for `inbound.dekkfix.no` pointing to `mx.sendgrid.net`) in your DNS provider and in SendGrid. Without this, emails forwarded to `hei@inbound.dekkfix.no` won't actually be received.

### 2. Fix the domain status alert to avoid confusion

Update `GoogleGroupSetupStep.tsx` and `EmailForwardingSetupStep.tsx` so the alert message distinguishes between:
- **Matching domain found**: "Domain **dekkfix.no** is configured and ready!" (correct domain)
- **Falling back to different domain**: "Domain **dekkfix.no** is not yet configured. Using **noddi.no** as fallback." (warns the user)
- **No domain at all**: "Domain configuration required. Contact support."

This way, when no matching domain exists, the user sees the fallback warning instead of a false success message.

## Technical Details

### File 1: `src/components/admin/wizard/GoogleGroupSetupStep.tsx` (lines 167-183)

Update the domain status alert to check whether the displayed domain matches the email's domain:

```typescript
{publicEmail && emailDomain && !domainsLoading && (
  <Alert className={matchingDomain ? "border-success/50 bg-success/5" : configuredDomain ? "border-warning/50 bg-warning/5" : "border-destructive/50 bg-destructive/5"}>
    {matchingDomain ? (
      <CheckCircle2 className="h-4 w-4 text-success" />
    ) : (
      <AlertCircle className="h-4 w-4 text-warning" />
    )}
    <AlertDescription>
      {matchingDomain ? (
        <span>Domain <strong>{matchingDomain.domain}</strong> is configured and ready!</span>
      ) : configuredDomain ? (
        <span>Domain <strong>{emailDomain}</strong> is not configured yet. Falling back to <strong>{configuredDomain.domain}</strong>.</span>
      ) : (
        <span>Domain <strong>{emailDomain}</strong> is not configured. Contact support to set it up.</span>
      )}
    </AlertDescription>
  </Alert>
)}
```

### File 2: `src/components/admin/wizard/EmailForwardingSetupStep.tsx`

Same alert logic update as above.

## Summary

| # | Change | Details |
|---|--------|---------|
| 1 | Add dekkfix.no domain | SQL insert into `email_domains` table (+ DNS setup needed) |
| 2 | Fix alert in GoogleGroupSetupStep | Show fallback warning when using a different domain |
| 3 | Fix alert in EmailForwardingSetupStep | Same fallback warning |

