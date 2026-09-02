# 16. Uptime first: no speculative refactors on hot paths

- Status: Accepted
- Date: 2026-09-02
- Deciders: Support Hub engineering

## Context

The product carries live customer support traffic for several organizations with a 99.9% uptime expectation.

## Decision

Treat the inbound email parser, the outbound sender, the shared email threading module and the widget AI chat function as hot paths. Changes there are diffed line by line, shipped on their own, and never bundled with unrelated refactoring. Broad mechanical refactors are staged vendor by vendor or module by module with a typecheck and build gate between phases.

## Consequences

- Slower refactors, fewer incidents.
- Some duplication survives longer than it would otherwise.
