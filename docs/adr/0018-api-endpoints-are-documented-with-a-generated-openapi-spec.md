# 18. API endpoints are documented with a generated OpenAPI spec rendered by Scalar

- Status: Accepted
- Date: 2026-09-02
- Deciders: Support Hub engineering

## Context

The service's public surface is ~150 Supabase edge functions. Nothing described them in one
place, so callers had to read the handler source, and hand-written API docs would rot within
weeks.

## Decision

Generate an OpenAPI 3.1 document from the function sources (`scripts/generate-openapi.ts`,
`npm run docs:api`) and render it in the app at `/api-docs` with Scalar, behind the same
authentication as `/docs`.

Descriptions come from each function's leading comment block, auth from `verify_jwt` in
`supabase/config.toml`, and verbs, body fields and query parameters are inferred from the
handler code.

## Consequences

- The endpoint list can never drift from the code, and documenting an endpoint means writing
  a comment at the top of its `index.ts`.
- Request and response schemas are inferred, so they are indicative rather than contractual;
  functions needing exact contracts must describe them in their comment block.
- The spec is regenerated manually, so a newly added function is missing until someone runs
  the script (CI-checkable if drift becomes a problem).
