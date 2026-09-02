# 7. Inbound email pipeline: Google Group to SendGrid to edge function

- Status: Accepted
- Date: 2026-09-02
- Deciders: Support Hub engineering

## Context

Support addresses live on the customers' own Google Workspace domains and cannot point their MX records at us.

## Decision

Route support addresses to a Google Group that forwards to a SendGrid inbound-parse address; SendGrid posts to the `sendgrid-inbound` edge function, which resolves the inbox by recipient domain, deduplicates the Google Group echo, reattributes the original sender and threads the message. Multiple email domains can map to one organization.

## Consequences

- Customers keep their existing mail setup.
- Forwarding hides the original envelope sender, so attribution relies on header reconstruction.
- Unconfigured domains fall back to a default subdomain instead of dropping mail.
