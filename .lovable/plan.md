

# Auto-configure SendGrid domain in the Add Email wizard

## Problem

When a user enters an email like `hei@dekkfix.no` in the "Add Email" wizard, the system only creates an `inbound_routes` record. It does NOT call the `sendgrid-setup` edge function to actually configure the domain in SendGrid (parse route, sender authentication, DNS records). This means emails sent to `hei@inbound.dekkfix.no` won't actually be received.

Currently, users must separately go to the "Email Domain Setup (SendGrid)" section and manually enter the domain there first. This is confusing and not intuitive.

## Solution

When the wizard detects that the email's domain is not yet configured (no matching `email_domains` record, or status is `pending` without DNS verified), it should automatically call `sendgrid-setup` to configure it before creating the inbound route. It should also show the user any DNS records they need to add.

## Technical Changes

### File 1: `src/components/admin/wizard/GoogleGroupSetupStep.tsx`

In the `createInboundRoute` function (around line 75), before creating the route:

1. Check if `matchingDomain` exists and has status `active`
2. If not, call the `sendgrid-setup` edge function with the email's domain and `inbound` as parse subdomain
3. Show the DNS records returned (MX + sender auth CNAMEs) in a new section below the route creation
4. Still create the inbound route so the system is ready once DNS propagates

```typescript
// Before creating the route, ensure domain is configured in SendGrid
if (!matchingDomain || matchingDomain.status !== 'active') {
  const { data: setupResult, error: setupError } = await supabase.functions.invoke('sendgrid-setup', {
    body: { domain: emailDomain, parse_subdomain: 'inbound' },
  });
  if (setupError) {
    toast.error('Failed to configure domain in SendGrid: ' + setupError.message);
    return;
  }
  // Store DNS records to display to user
  setDnsRecords(setupResult?.dns_records || null);
  setSendgridSetupResult(setupResult);
}
```

Add new state variables:
```typescript
const [dnsRecords, setDnsRecords] = useState<any>(null);
const [sendgridSetupResult, setSendgridSetupResult] = useState<any>(null);
```

Add a new UI section after route creation showing DNS records the user needs to add (MX record + any CNAME records for sender authentication), similar to what `SendgridSetupWizard.tsx` shows.

### File 2: `src/components/admin/wizard/EmailForwardingSetupStep.tsx`

Same changes as above -- call `sendgrid-setup` when the domain isn't configured, and display DNS records.

### No edge function changes needed

The `sendgrid-setup` edge function already handles everything: creating sender auth, creating parse routes, upserting `email_domains` records. We just need to call it from the wizard.

## What the user will see

1. Enter `hei@dekkfix.no` in the wizard
2. Click "Set Up Forwarding Route"
3. The wizard automatically calls SendGrid to configure `dekkfix.no`
4. A section appears showing DNS records to add (MX record for `inbound.dekkfix.no` and any sender auth CNAMEs)
5. The forwarding route is created
6. User adds DNS records and email starts flowing

## Summary

| File | Change |
|------|--------|
| `GoogleGroupSetupStep.tsx` | Auto-call `sendgrid-setup` for unconfigured domains, show DNS records |
| `EmailForwardingSetupStep.tsx` | Same auto-setup and DNS display |

