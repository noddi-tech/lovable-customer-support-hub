# API reference

Every HTTP endpoint this service exposes is a Supabase edge function, served under
`https://<project-ref>.supabase.co/functions/v1/<function-name>`. There is no separate
API server.

The reference is rendered in the app at `/api-docs` with [Scalar](https://scalar.com),
from an OpenAPI 3.1 document generated out of the function sources.

## Regenerating

```bash
bun run docs:api   # writes src/data/openapi.generated.json
```

Run this after adding, renaming or removing an edge function. The generator reads:

- the folder names under `supabase/functions/` (one endpoint each),
- the leading comment block of `index.ts` as the endpoint description,
- `verify_jwt` from `supabase/config.toml` to mark endpoints public or JWT-protected,
- `req.method` checks and `Access-Control-Allow-Methods` for the HTTP verbs,
- destructured `await req.json()` fields and `searchParams.get()` calls for the request
  body and query parameters.

Because bodies are inferred, they are indicative rather than contractual. To document an
endpoint properly, write a clear comment block at the top of its `index.ts` — that text is
what readers see in the reference.

## Auth

JWT-protected endpoints expect `Authorization: Bearer <supabase access token>`. Endpoints
marked public are called by external providers (SendGrid, Meta, Aircall, Slack) or by
unauthenticated surfaces (chat widget, candidate forms) and perform their own signature or
token verification.
