# 5. Branded ProfileId and AuthUserId types

- Status: Accepted
- Date: 2026-09-02
- Deciders: Support Hub engineering

## Context

Supabase auth user ids and `profiles.id` are both uuids but are not interchangeable. Mixing them silently produced empty assignment lists and broken "assigned to me" filters.

## Decision

Model them as distinct branded TypeScript types. Foreign keys such as `conversations.assigned_to_id` always take a `ProfileId`; only auth calls take an `AuthUserId`. Conversions are explicit and go through the dedicated hooks.

## Consequences

- The class of bug becomes a compile error.
- Some boundaries (RPC payloads, raw query results) still need an explicit cast.
