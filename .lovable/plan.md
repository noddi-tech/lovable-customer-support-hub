
# Fix: Forwarding Address Uses Wrong Domain

## Problem

When entering `hei@dekkfix.no`, the forwarding address shows `hei@inbound.noddi.no` instead of `hei@inbound.dekkfix.no`. This happens because `dekkfix.no` doesn't exist in `email_domains` yet, so the code falls back to the first available domain (noddi.no).

## Root Cause

In `GoogleGroupSetupStep.tsx` line 58:
```
const configuredDomain = matchingDomain || getConfiguredDomain();
```
When `matchingDomain` is null, it picks noddi.no. Then `generateForwardingAddress` uses that domain's `parse_subdomain` + `domain` to build the address.

## Fix

**File: `src/hooks/useDomainConfiguration.ts`** -- Update `generateForwardingAddress` to accept an optional target domain name override. When the email's domain doesn't match any existing configured domain, construct the forwarding address using the email's own domain with a default `inbound` subdomain.

```typescript
const generateForwardingAddress = (email: string, configuredDomain?: DomainConfig) => {
  const localPart = email.split('@')[0];
  const emailDomain = email.split('@')[1]?.toLowerCase();
  const domain = configuredDomain || getConfiguredDomain();

  if (domain) {
    // If configuredDomain matches the email's domain, use it
    if (domain.domain === emailDomain) {
      return `${localPart}@${domain.parse_subdomain}.${domain.domain}`;
    }
  }

  // For unconfigured domains, use the email's own domain with default subdomain
  if (emailDomain) {
    return `${localPart}@inbound.${emailDomain}`;
  }

  // Fallback
  return `${localPart}@inbound.noddi.no`;
};
```

**File: `src/components/admin/wizard/GoogleGroupSetupStep.tsx`** -- Simplify the `configuredDomain` logic: only use `matchingDomain` (exact match), don't fall back to a different domain. The forwarding address generation will handle the unconfigured case.

Change line 58 from:
```
const configuredDomain = matchingDomain || getConfiguredDomain();
```
to:
```
const configuredDomain = matchingDomain;
```

And update the condition on line 225 to also show the forwarding address when no `configuredDomain` exists (since `generateForwardingAddress` now handles that case):
```
{publicEmail && forwardingAddress && (
```

Same update on line 249 for the "Create Route" button visibility.

## Result

- `hei@dekkfix.no` produces `hei@inbound.dekkfix.no`
- `hei@noddi.no` (already configured) produces `hei@inbound.noddi.no`
- The SendGrid setup call on route creation will auto-provision the new domain as it already does
