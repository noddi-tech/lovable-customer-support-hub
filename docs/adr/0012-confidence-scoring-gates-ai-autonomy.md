# 12. Confidence scoring gates AI autonomy

- Status: Accepted
- Date: 2026-09-02
- Deciders: Support Hub engineering

## Context

Fully autonomous replies are unacceptable on a support channel where a wrong answer costs a booking, but reviewing every draft removes the benefit.

## Decision

Score each candidate answer and compare it against a per-topic autonomy threshold configured in the Knowledge area. Below the threshold, the answer becomes an internal AI draft that an agent sends, edits or discards; those three outcomes are logged as preference pairs and feed the training flywheel. AI drafts are never auto-sent.

## Consequences

- Autonomy can be raised per topic as evidence accumulates.
- Draft quality improves from real agent decisions rather than synthetic labels.
