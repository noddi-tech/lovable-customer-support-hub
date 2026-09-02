# 9. Third-party integrations live in an integrations folder

- Status: Accepted
- Date: 2026-09-02
- Deciders: Support Hub engineering

## Context

Vendor calls were spread across dozens of edge functions and lib files, each with its own base URL, auth header and error handling. Rotating a vendor or changing an API version meant a repository-wide search.

## Decision

Every third-party vendor gets a thin SDK client under `supabase/functions/_shared/integrations/<vendor>/` for the backend and `src/integrations/<vendor>/` for the frontend, exported through a barrel file. Callers import the client; raw vendor hostnames outside those folders are a lint failure.

## Consequences

- Vendor surface area is visible in one place, mirroring the backend repository layout.
- Migration of existing callers happens vendor by vendor, so both styles coexist during the transition.
