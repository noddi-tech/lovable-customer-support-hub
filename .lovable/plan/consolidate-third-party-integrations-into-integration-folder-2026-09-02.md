# Consolidate third-party integrations into integration folders

Today integration code is scattered: `src/integrations/` only holds Supabase, while Aircall lives in `src/lib/aircall-*.ts` + `src/contexts`, and every edge function hand-rolls its own `fetch` against OpenAI, SendGrid, Slack, Meta Graph, Aircall, Navio/Noddi, Gmail, Messente, Resend and Help Scout (base URLs, auth headers, retries and error shapes duplicated across 60+ files).

Goal: one thin SDK client per vendor, in one predictable place, with every caller going through it. No behaviour change.

## Target structure

```text
src/integrations/
  supabase/            (unchanged)
  aircall/             browser SDK wrapper: client, event bridge, types, index.ts
  navio/               typed wrappers over the noddi-* edge functions
  README.md            what each folder is + rules

supabase/functions/_shared/integrations/
  http.ts              shared fetch helper: base URL, auth, timeout, retry, error type
  openai/              chat completions, embeddings
  sendgrid/            send mail, webhook/parse helpers
  slack/               postMessage, DM, blocks
  meta/                Graph API: pages, leadgen forms, tokens, webhooks
  aircall/             REST: contacts, tags, calls
  navio/               Noddi backend API: REST + MCP fallback
  google/              Gmail + OAuth token exchange
  messente/            already partly done under smsProviders — moved here
  resend/  helpscout/  thin one-call clients
  index.ts             re-exports
```

Each vendor folder is the same shape: `client.ts` (auth + request), `types.ts`, `index.ts`. Clients stay thin — no business logic, no Supabase access, no org lookups; those stay in the calling function.

## Phasing (each phase ships independently, nothing breaks mid-way)

1. **Foundation** — add `_shared/integrations/http.ts` and the folder skeleton; add `src/integrations/README.md` documenting the convention.
2. **Edge clients, highest duplication first** — OpenAI (22 files), Meta Graph (15), Slack (10), SendGrid (6), Navio (14), then Aircall / Google / Messente / Resend / Help Scout. Add each client with its callers migrated in the same pass, one vendor per pass, so a regression is traceable to one vendor.
3. **Frontend** — move `src/lib/aircall-phone.ts` and `aircall-event-bridge.ts` into `src/integrations/aircall/` (re-export shims left behind briefly, then imports updated and shims deleted); add `src/integrations/navio/` wrapping the `noddi-*` function invocations that hooks currently call ad hoc. `AircallContext` keeps living in `src/contexts` and consumes the integration client.
4. **Cleanup** — delete shims, add a lint rule that fails on raw third-party hostnames outside `integrations/`.

## Notes

- Existing shared modules that are already vendor-specific (`smsProviders/`, `meta-signed-request.ts`, `meta-origin.ts`, `navio-source.ts`, `navio-scope.ts`, `mcp-client.ts`) move under the matching vendor folder rather than being rewritten.
- Secrets keep being read with `Deno.env.get` inside the client, so no secret names change and no redeploy of secrets is needed.
- Every touched edge function is redeployed as part of its phase; typecheck + build run per phase.
- Uptime-sensitive paths (inbound email, send-reply-email, widget AI loop) are migrated last within their vendor pass and diffed line-by-line.

## Scope check

This is a mechanical, wide refactor: roughly 60 edge functions and ~10 frontend files. I can do it all in sequence, or stop after any phase.
