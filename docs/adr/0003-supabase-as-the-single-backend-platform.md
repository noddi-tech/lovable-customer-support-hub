# 3. Supabase as the single backend platform

- Status: Accepted
- Date: 2026-09-02
- Deciders: Support Hub engineering

## Context

The product needs persistence, auth, file storage, scheduled jobs and server-side integrations, but the app itself is a client-side Vite/React bundle with no server runtime.

## Decision

Use one external Supabase project for Postgres, Auth, Storage, Realtime and Edge Functions. All server-side logic is a Deno edge function under `supabase/functions/`. All schema changes go through migrations. Every table in `public` is created together with explicit `GRANT`s and row level security policies; the Data API grants nothing by default.

## Consequences

- A single deployment target and a single security model.
- RLS is the primary authorization boundary, so every new table needs policies before it is usable.
- Service-role credentials never leave edge functions.
