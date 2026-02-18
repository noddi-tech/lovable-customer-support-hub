

# Restore SendGrid Domain Setup to Integrations Page

## Problem

The `SendgridSetupWizard` component (for provisioning new domains, creating parse routes, and showing DNS records) is imported but never rendered anywhere in the UI. It was lost during the admin portal refactor.

## Solution

Add the `SendgridSetupWizard` as a collapsible section within the Email tab of the Integrations page, below the existing Email Channels section. This keeps all email domain management in one place.

## Changes

### File: `src/components/admin/IntegrationSettings.tsx`

- Import `SendgridSetupWizard`
- Add a new `IntegrationSection` after the "Email Channels (SendGrid)" section, titled something like "Domain Setup (SendGrid)" with a description like "Add new email domains, create parse routes, and manage DNS records"
- This section will be collapsed by default since it's used less frequently
- The `SendgridSetupWizard` already includes the webhook fixer and tester tools

This means you'll be able to:
1. Scroll down on the Email tab past "Email Channels"
2. Expand "Domain Setup (SendGrid)"
3. Enter `dekkfix.no` / `inbound` and click "Create Parse Route" to re-trigger provisioning

