# 11. AI answers with interactive markers, not prose instructions

- Status: Accepted
- Date: 2026-09-02
- Deciders: Support Hub engineering

## Context

When the widget assistant listed booking options as plain text, customers replied with free text the flow could not parse, and the model confirmed bookings that were never made.

## Decision

The assistant emits structured markers (for example `[TIME_SLOT]`, `[PHONE_VERIFY]`) that the client renders as interactive elements. It never writes plain-text option lists or confirmations for anything transactional. Booking flows are orchestrated as a multi-step cart driven by tool calls, with identity verification triggered by the flow rather than by the model's judgement.

## Consequences

- State transitions are deterministic and auditable.
- Every new flow step needs both a marker and a renderer.
- Model output that omits a marker is treated as a flow error, not as an answer.
