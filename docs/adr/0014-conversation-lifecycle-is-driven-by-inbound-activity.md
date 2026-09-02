# 14. Conversation lifecycle is driven by inbound activity

- Status: Accepted
- Date: 2026-09-02
- Deciders: Support Hub engineering

## Context

Agents closed threads that the customer then replied to, and archived threads disappeared from view even though work remained.

## Decision

An inbound message reopens a closed conversation. Archiving hides a thread from the default list but keeps it visible in filters until it is explicitly closed. Soft-deleted and archived threads are excluded from every count, badge and SLA query. `updated_at` tracks real activity only — metadata changes never bump it. Only failed outgoing agent replies can be deleted.

## Consequences

- Counts, SLA badges and inbox totals agree with what the list actually shows.
- Every new aggregate query must remember the `deleted_at` and `is_archived` filters.
