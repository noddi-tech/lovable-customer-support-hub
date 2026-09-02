# 10. Oslo local time everywhere in the product surface

- Status: Accepted
- Date: 2026-09-02
- Deciders: Support Hub engineering

## Context

Timestamps are stored in UTC, but every operator and customer is in Norway. Mixed rendering produced booking slots an hour off during daylight saving transitions.

## Decision

Store UTC, render `Europe/Oslo`. Every user-facing string and every AI-generated time — including delivery windows and scheduling — is normalized to Oslo time. Scheduled jobs map cron invocations against local time. First login captures the user's locale for 12h/24h formatting only, never for the timezone.

## Consequences

- No off-by-one-hour bugs across DST.
- International expansion will require revisiting this decision with a per-organization timezone.
