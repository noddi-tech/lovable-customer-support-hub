# 8. One outbound email utility

- Status: Accepted
- Date: 2026-09-02
- Deciders: Support Hub engineering

## Context

Six edge functions each built their own SendGrid payload, and provider quirks (charset in `content[].type`, header encoding) had to be fixed in every copy.

## Decision

All outbound mail goes through the shared `send-email` function and the `sendOutboundEmail` helper. It owns provider selection, UTF-8 encoding rules, threading headers, retry on transient database lookups and delivery-status writeback.

## Consequences

- Provider quirks are fixed once.
- The utility is a hot path, so changes to it are treated as uptime-critical.
