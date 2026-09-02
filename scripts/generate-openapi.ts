#!/usr/bin/env tsx
/**
 * Generates src/data/openapi.generated.json — an OpenAPI 3.1 document that
 * describes every Supabase edge function this service exposes. Rendered in the
 * app at /api-docs with Scalar.
 *
 * Run: bun run scripts/generate-openapi.ts
 */
import { existsSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from "node:fs"
import { dirname, join } from "node:path"

const FUNCTIONS_DIR = "supabase/functions"
const CONFIG_PATH = "supabase/config.toml"
const OUT_PATH = "src/data/openapi.generated.json"

function parseVerifyJwt(): Record<string, boolean> {
  const config = readFileSync(CONFIG_PATH, "utf8")
  const map: Record<string, boolean> = {}
  const re = /\[functions\.([^\]]+)\]\s*\n(?:[^[]*?)verify_jwt\s*=\s*(true|false)/g
  let m: RegExpExecArray | null
  while ((m = re.exec(config))) map[m[1]] = m[2] === "true"
  return map
}

/** Leading comment block of the entry file, used as the operation description. */
function describe(source: string): string {
  const parts: string[] = []
  for (const raw of source.split("\n")) {
    const line = raw.trim()
    if (!line) {
      if (parts.length) break
      continue
    }
    if (line.startsWith("//")) parts.push(line.replace(/^\/\/\s?/, ""))
    else if (line.startsWith("/*") || line.startsWith("*")) {
      const cleaned = line
        .replace(/^\/\*+\s?/, "")
        .replace(/^\*+\/?\s?/, "")
        .replace(/\*\/$/, "")
        .trim()
      if (cleaned) parts.push(cleaned)
    } else break
  }
  return parts.join(" ").trim()
}

/** HTTP methods the handler reacts to; POST when nothing else can be inferred. */
function detectMethods(source: string): string[] {
  const found = new Set<string>()
  const allow = source.match(/Access-Control-Allow-Methods'?"?\s*:\s*['"]([^'"]+)['"]/)
  if (allow) {
    for (const m of allow[1].split(",")) {
      const method = m.trim().toUpperCase()
      if (method && method !== "OPTIONS") found.add(method)
    }
  }
  for (const m of source.matchAll(/req\.method\s*===?\s*['"]([A-Z]+)['"]/g)) {
    if (m[1] !== "OPTIONS") found.add(m[1])
  }
  for (const m of source.matchAll(/req\.method\s*!==?\s*['"]([A-Z]+)['"]/g)) {
    if (m[1] !== "OPTIONS") found.add(m[1])
  }
  if (found.size === 0) found.add("POST")
  return [...found].sort()
}

/** Body fields destructured off `await req.json()` or read from the parsed body. */
function detectBodyFields(source: string): string[] {
  const fields = new Set<string>()
  for (const m of source.matchAll(
    /const\s*\{([^}]+)\}\s*(?::[^=]+)?=\s*(?:await\s+)?(?:req\.json\(\)|body|payload)/g,
  )) {
    for (const part of m[1].split(",")) {
      const name = part.split(":")[0].split("=")[0].trim()
      if (/^[A-Za-z_][A-Za-z0-9_]*$/.test(name)) fields.add(name)
    }
  }
  for (const m of source.matchAll(/body(?:\?)?\.([A-Za-z_][A-Za-z0-9_]*)/g)) fields.add(m[1])
  return [...fields].sort().slice(0, 40)
}

/** Query parameters read from the request URL. */
function detectQueryParams(source: string): string[] {
  const params = new Set<string>()
  for (const m of source.matchAll(/searchParams\.get\(\s*['"]([^'"]+)['"]/g)) params.add(m[1])
  return [...params].sort()
}

/** Group functions into tags by their name prefix. */
const TAG_RULES: Array<[RegExp, string]> = [
  [/^admin-|^super-|^audit-/, "Admin & audit"],
  [/^aircall|^call-|^voice/, "Voice (Aircall)"],
  [/^widget|^chat-|^live-chat/, "Widget & live chat"],
  [/email|sendgrid|reply|inbound|smtp|resend/, "Email"],
  [/^sms|whatsapp|messente/, "SMS & messaging"],
  [/slack/, "Slack"],
  [/noddi|navio/, "Noddi / Navio"],
  [/recruitment|applicant|candidate|bulk-import/, "Recruitment"],
  [/knowledge|embedding|evaluate|ai-|classify|autonom/, "AI & knowledge"],
  [/gdpr|meta-/, "Compliance & Meta"],
  [/^cleanup-|^auto-|^backfill-|^process-|^bulk-|cron/, "Scheduled jobs"],
]

function tagFor(name: string): string {
  for (const [re, tag] of TAG_RULES) if (re.test(name)) return tag
  return "Other"
}

const verifyJwt = parseVerifyJwt()

const names = readdirSync(FUNCTIONS_DIR)
  .filter(
    (n) => !n.startsWith("_") && !n.includes(".") && statSync(join(FUNCTIONS_DIR, n)).isDirectory(),
  )
  .sort()

const paths: Record<string, Record<string, unknown>> = {}
const tags = new Set<string>()

for (const name of names) {
  const entry = join(FUNCTIONS_DIR, name, "index.ts")
  const source = existsSync(entry) ? readFileSync(entry, "utf8") : ""
  const requiresAuth = verifyJwt[name] ?? true
  const tag = tagFor(name)
  tags.add(tag)

  const description = [
    describe(source) ||
      "No description available. Add a leading comment to the edge function to document it.",
    "",
    requiresAuth
      ? "**Auth:** requires a Supabase JWT (`Authorization: Bearer <access_token>`)."
      : "**Auth:** public endpoint (`verify_jwt = false`). Called by external providers or unauthenticated surfaces.",
  ].join("\n")

  const queryParams = detectQueryParams(source)
  const bodyFields = detectBodyFields(source)
  const operations: Record<string, unknown> = {}

  for (const method of detectMethods(source)) {
    const op: Record<string, unknown> = {
      tags: [tag],
      summary: name,
      operationId: `${method.toLowerCase()}_${name.replace(/-/g, "_")}`,
      description,
      security: requiresAuth ? [{ bearerAuth: [] }] : [],
      responses: {
        "200": { description: "Success" },
        "400": { description: "Invalid request" },
        ...(requiresAuth ? { "401": { description: "Missing or invalid JWT" } } : {}),
        "500": { description: "Unhandled error" },
      },
    }
    if (queryParams.length) {
      op.parameters = queryParams.map((p) => ({
        name: p,
        in: "query",
        required: false,
        schema: { type: "string" },
      }))
    }
    if (method !== "GET" && method !== "DELETE" && bodyFields.length) {
      op.requestBody = {
        required: true,
        content: {
          "application/json": {
            schema: {
              type: "object",
              description: "Fields inferred from the function source; types are not enforced here.",
              properties: Object.fromEntries(bodyFields.map((f) => [f, {}])),
            },
          },
        },
      }
    }
    operations[method.toLowerCase()] = op
  }

  paths[`/functions/v1/${name}`] = operations
}

const spec = {
  openapi: "3.1.0",
  info: {
    title: "Support Hub API",
    version: "1.0.0",
    description: [
      "Every HTTP endpoint this service exposes is a Supabase edge function served under",
      "`/functions/v1/<name>` on the project domain.",
      "",
      "This document is generated from the function sources at build time",
      "(`bun run scripts/generate-openapi.ts`), so it can never drift far from the code.",
      "Request bodies are inferred from the handlers and are indicative, not contractual.",
      "",
      "Endpoints marked public are reachable without a JWT because an external provider",
      "(SendGrid, Meta, Aircall, Slack) or an unauthenticated surface (chat widget,",
      "candidate forms) calls them; they perform their own signature or token checks.",
    ].join("\n"),
  },
  servers: [
    {
      url: "{supabaseUrl}",
      variables: { supabaseUrl: { default: "https://<project-ref>.supabase.co" } },
    },
  ],
  tags: [...tags].sort().map((name) => ({ name })),
  components: {
    securitySchemes: {
      bearerAuth: { type: "http", scheme: "bearer", bearerFormat: "JWT" },
    },
  },
  paths,
}

mkdirSync(dirname(OUT_PATH), { recursive: true })
writeFileSync(OUT_PATH, JSON.stringify(spec, null, 2))
console.log(`Wrote ${names.length} endpoints to ${OUT_PATH}`)
