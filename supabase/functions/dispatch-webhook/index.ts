import { serve } from "https://deno.land/std@0.190.0/http/server.ts"
import { requireUser } from "../_shared/auth.ts"
import { isServiceRoleRequest } from "../_shared/caller.ts"

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version, x-app-version, x-supabase-api-version",
  "Access-Control-Allow-Methods": "GET, POST, PUT, PATCH, DELETE, OPTIONS",
}

interface DispatchWebhookRequest {
  url: string
  headers?: Record<string, string> | null
  body: Record<string, unknown>
  message_template?: string | null
}

interface DispatchWebhookResponse {
  success: boolean
  http_status: number | null
  response_excerpt: string
  duration_ms: number
  error: string | null
}

const TIMEOUT_MS = 10_000
const RESPONSE_EXCERPT_MAX = 2048

const BLOCKED_HOSTNAMES = new Set([
  "localhost",
  "metadata.google.internal",
  "metadata",
  "instance-data",
])

function isPrivateIpv4(host: string): boolean {
  const m = host.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/)
  if (!m) return false
  const [a, b] = [Number(m[1]), Number(m[2])]
  if ([a, Number(m[2]), Number(m[3]), Number(m[4])].some((n) => n > 255)) return true
  if (a === 10 || a === 127 || a === 0) return true
  if (a === 169 && b === 254) return true // link-local / cloud metadata
  if (a === 172 && b >= 16 && b <= 31) return true
  if (a === 192 && b === 168) return true
  if (a === 100 && b >= 64 && b <= 127) return true // CGNAT
  return false
}

/** SSRF guard: only outbound HTTPS to public hosts is allowed. */
function validateWebhookUrl(raw: string): { ok: true; url: URL } | { ok: false; reason: string } {
  let url: URL
  try {
    url = new URL(raw)
  } catch {
    return { ok: false, reason: "Invalid URL" }
  }
  if (url.protocol !== "https:") {
    return { ok: false, reason: "Only https:// webhook URLs are allowed" }
  }
  const host = url.hostname.toLowerCase().replace(/^\[|\]$/g, "")
  if (BLOCKED_HOSTNAMES.has(host) || host.endsWith(".localhost") || host.endsWith(".internal")) {
    return { ok: false, reason: "Webhook host is not allowed" }
  }
  if (isPrivateIpv4(host)) {
    return { ok: false, reason: "Webhook host resolves to a private address" }
  }
  // IPv6 loopback / unique-local / link-local
  if (host === "::1" || host.startsWith("fc") || host.startsWith("fd") || host.startsWith("fe80")) {
    return { ok: false, reason: "Webhook host is not allowed" }
  }
  const supabaseHost = (() => {
    try {
      return new URL(Deno.env.get("SUPABASE_URL") ?? "").hostname
    } catch {
      return ""
    }
  })()
  if (supabaseHost && host === supabaseHost) {
    return { ok: false, reason: "Webhook host is not allowed" }
  }
  return { ok: true, url }
}

/** Headers a caller may not override (prevents credential relaying). */
const FORBIDDEN_HEADERS = new Set(["host", "cookie", "apikey", "x-forwarded-for"])

/**
 * Substitute {{foo.bar}} patterns in `template` using values from `scope`.
 * Unknown / unresolved paths stay literal. No recursion, no escaping.
 */
function renderMessageTemplate(template: string, scope: Record<string, unknown>): string {
  return template.replace(/\{\{\s*([\w.]+)\s*\}\}/g, (match, path: string) => {
    const parts = path.split(".")
    let cur: unknown = scope
    for (const part of parts) {
      if (cur !== null && typeof cur === "object" && part in (cur as Record<string, unknown>)) {
        cur = (cur as Record<string, unknown>)[part]
      } else {
        return match
      }
    }
    if (cur === null || cur === undefined) return match
    if (typeof cur === "object") return JSON.stringify(cur)
    return String(cur)
  })
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders })
  }

  const startedAt = performance.now()

  try {
    // AuthZ: internal automation (service role) or a signed-in user only.
    if (!isServiceRoleRequest(req)) {
      const auth = await requireUser(req)
      if ("response" in auth) {
        return new Response(JSON.stringify({ error: "Unauthorized" }), {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        })
      }
    }

    const payload = (await req.json()) as DispatchWebhookRequest
    const { url, headers, body, message_template } = payload

    if (!url || typeof url !== "string") {
      return new Response(JSON.stringify({ error: "Missing or invalid 'url'" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      })
    }
    const urlCheck = validateWebhookUrl(url)
    if (!urlCheck.ok) {
      return new Response(JSON.stringify({ error: urlCheck.reason }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      })
    }
    if (body === undefined || body === null || typeof body !== "object") {
      return new Response(
        JSON.stringify({ error: "Missing or invalid 'body' (must be an object)" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      )
    }

    // Build outbound payload
    let outboundBody: unknown
    if (message_template && typeof message_template === "string") {
      // Render with the request body as the substitution scope, so callers
      // can use {{context.foo}}, {{rule.bar}}, {{event.baz}}, etc.
      const rendered = renderMessageTemplate(message_template, body as Record<string, unknown>)
      outboundBody = { text: rendered }
    } else {
      outboundBody = body
    }

    const outboundHeaders: Record<string, string> = {
      "Content-Type": "application/json",
    }
    if (headers && typeof headers === "object") {
      for (const [k, v] of Object.entries(headers)) {
        if (typeof v === "string" && !FORBIDDEN_HEADERS.has(k.toLowerCase())) {
          outboundHeaders[k] = v
        }
      }
    }

    // Enforce 10s timeout
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS)

    let response: Response
    try {
      response = await fetch(urlCheck.url.toString(), {
        method: "POST",
        redirect: "manual",
        headers: outboundHeaders,
        body: JSON.stringify(outboundBody),
        signal: controller.signal,
      })
    } catch (fetchErr: unknown) {
      clearTimeout(timeoutId)
      const durationMs = Math.round(performance.now() - startedAt)
      const err = fetchErr as Error
      const aborted = err?.name === "AbortError"
      const result: DispatchWebhookResponse = {
        success: false,
        http_status: null,
        response_excerpt: "",
        duration_ms: durationMs,
        error: aborted
          ? `Timed out after ${TIMEOUT_MS}ms`
          : `fetch failed: ${err?.message ?? String(fetchErr)}`,
      }
      return new Response(JSON.stringify(result), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      })
    }
    clearTimeout(timeoutId)

    const text = await response.text()
    const durationMs = Math.round(performance.now() - startedAt)

    const result: DispatchWebhookResponse = {
      success: response.ok,
      http_status: response.status,
      response_excerpt: text.slice(0, RESPONSE_EXCERPT_MAX),
      duration_ms: durationMs,
      error: response.ok ? null : `Webhook returned HTTP ${response.status}`,
    }

    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    })
  } catch (error: unknown) {
    const durationMs = Math.round(performance.now() - startedAt)
    const err = error as Error
    console.error("Error in dispatch-webhook:", err)
    const result: DispatchWebhookResponse = {
      success: false,
      http_status: null,
      response_excerpt: "",
      duration_ms: durationMs,
      error: err?.message ?? "Unknown error",
    }
    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    })
  }
}

serve(handler)
