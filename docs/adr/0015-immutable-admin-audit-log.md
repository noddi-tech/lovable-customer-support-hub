# 15. Immutable admin audit log

- Status: Accepted
- Date: 2026-09-02
- Deciders: Support Hub engineering

## Context

Compliance work (SOC 2, GDPR) requires an accountable record of administrative action, and support of a shared tenant needs forensics after the fact.

## Decision

Write every administrative action to `admin_audit_logs` from the server side, with no update or delete policy for any role. Retention and suspicious-activity detection run as database functions. The super-admin UI reads, filters and exports it.

## Consequences

- The trail cannot be edited by the people it describes.
- Log volume grows unbounded without the retention job.
