# Integrations

One folder per third-party vendor. Each folder holds a **thin SDK client**:
transport, auth and typed responses — nothing else.

## Rules

- No business logic, no Supabase table access, no organization lookups in a client.
- Frontend clients never talk to a vendor API directly when a secret is needed;
  they call the matching edge function instead (see `navio/`).
- Import from the folder barrel (`@/integrations/aircall`), not the inner files.

## Frontend (`src/integrations/`)

| Folder      | What it is                                                          |
| ----------- | ------------------------------------------------------------------- |
| `supabase/` | Generated Supabase client + database types (do not edit `types.ts`) |
| `aircall/`  | Browser wrapper around the Aircall Everywhere SDK + event bridge    |
| `navio/`    | Typed invoker for the `noddi-*` edge-function proxies               |

## Backend (`supabase/functions/_shared/integrations/`)

`http.ts` provides `createHttpClient` (base URL, default headers, timeout,
retry on 408/425/429/5xx) plus `IntegrationError` and `requireEnv`.

| Folder       | Vendor                                         |
| ------------ | ---------------------------------------------- |
| `openai/`    | Chat completions + embeddings                  |
| `slack/`     | Web API (`chat.postMessage`, DMs, user lookup) |
| `sendgrid/`  | Mail send v3                                   |
| `meta/`      | Facebook Graph API (lead ads, webhooks)        |
| `aircall/`   | Aircall REST API (contacts, tags, calls)       |
| `navio/`     | Noddi/Navio backend API                        |
| `google/`    | OAuth token exchange + Gmail REST              |
| `messente/`  | SMS provider implementation                    |
| `resend/`    | Transactional email fallback                   |
| `helpscout/` | Mailbox API 2.0 (migration/import)             |

SMS providers are selected through `sms-registry.ts` (`getSmsProvider(name)`),
with the shared contract in `sms-types.ts`.

Secrets are read with `Deno.env.get` inside the client, so secret names never
change when a caller migrates.
