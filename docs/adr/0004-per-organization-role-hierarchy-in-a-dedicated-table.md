# 4. Per-organization role hierarchy in a dedicated table

- Status: Accepted
- Date: 2026-09-02
- Deciders: Support Hub engineering

## Context

The app is multi-tenant: several organizations share one database, and a role claim stored on a profile row would be editable by the very user it describes.

## Decision

Store roles in `user_roles` (`super_admin`, `admin`, `agent`, `user`) — never on `profiles`. Check them through the `has_role()` security-definer function inside RLS policies. `super_admin` is global but every super-admin action is still scoped to one organization at a time; `admin`, `agent` and `user` are organization-scoped through `organization_memberships`.

## Consequences

- Privilege escalation through a profile update is impossible.
- Policies avoid recursive RLS by going through a security-definer function.
- Role checks always cost a function call, which is why organization context is cached per session.
