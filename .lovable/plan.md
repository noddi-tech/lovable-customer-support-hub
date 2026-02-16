
# Fix: Wrong Domain in Email Wizard + Gmail Status Badge

## Problem 1: Wrong domain used for new integrations
When adding an email integration for `dekkfix.no`, the wizard uses `noddi.no` because `getConfiguredDomain()` returns the first/active domain globally. The forwarding address is generated as `hei@inbound.noddi.no` instead of `hei@inbound.dekkfix.no`.

## Problem 2: Gmail Direct Sync shows "Not Configured"
The status badge checks only for `provider === 'gmail'` accounts. The existing `hei@noddi.no` account has `provider === 'google-group'`, so it's not counted. The badge should reflect all email accounts in that section, not just OAuth ones.

---

## Technical Changes

### File 1: `src/components/admin/wizard/GoogleGroupSetupStep.tsx`

**A) Use email-matching domain instead of global default** (lines 44-54)

Add `getDomainByName` to the destructured hook. Replace `configuredDomain` logic:

```typescript
const { 
  getConfiguredDomain, 
  getDomainByName,
  generateForwardingAddress, 
  extractDomainFromEmail,
  isDomainConfigured,
  isLoading: domainsLoading 
} = useDomainConfiguration();

const emailDomain = extractDomainFromEmail(publicEmail);
const matchingDomain = emailDomain ? getDomainByName(emailDomain) : null;
const configuredDomain = matchingDomain || getConfiguredDomain();
```

Remove the duplicate `emailDomain` declaration on line 53.

**B) Update forwarding address generation** (line 59)

Already uses `configuredDomain`, so this will automatically use the correct domain after the variable change.

**C) Update `createInboundRoute`** (line 90)

Already uses `configuredDomain` variable -- no change needed.

### File 2: `src/components/admin/wizard/EmailForwardingSetupStep.tsx`

**Same domain-matching fix** (lines 31-37)

Add `getDomainByName` and `extractDomainFromEmail` to destructured hook. Replace:
```typescript
const emailDomain = extractDomainFromEmail(publicEmail);
const matchingDomain = emailDomain ? getDomainByName(emailDomain) : null;
const configuredDomain = matchingDomain || getConfiguredDomain();
```

### File 3: `src/components/admin/IntegrationSettings.tsx`

**Fix Gmail status badge** (lines 52-62)

Change `getGmailStatus` to consider ALL email accounts, not just `provider === 'gmail'`:

```typescript
const activeAccountCount = emailAccounts.filter(acc => acc.is_active).length;

const getGmailStatus = (): 'active' | 'inactive' | 'not-configured' => {
  if (activeAccountCount > 0) return 'active';
  if (emailAccounts.length > 0) return 'inactive';
  return 'not-configured';
};
```

This ensures that google-group accounts (like hei@noddi.no) are reflected in the status badge.

---

## Summary

| # | Issue | File | Fix |
|---|-------|------|-----|
| 1 | Wrong domain for new integrations | `GoogleGroupSetupStep.tsx` | Match domain from email input |
| 2 | Wrong domain for new integrations | `EmailForwardingSetupStep.tsx` | Match domain from email input |
| 3 | "Not Configured" badge incorrect | `IntegrationSettings.tsx` | Count all email accounts, not just gmail |
