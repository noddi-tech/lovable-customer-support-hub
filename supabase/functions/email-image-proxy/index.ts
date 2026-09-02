// Fetches remote images referenced by email bodies server-side so they render
// with their original formatting without leaking the agent's IP/cookies to the
// sender's tracking infrastructure.
import { requireUser } from "../_shared/auth.ts"

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version, x-app-version, x-supabase-api-version",
}

const MAX_BYTES = 10 * 1024 * 1024 // 10MB
const FETCH_TIMEOUT_MS = 10_000

const TRANSPARENT_GIF = Uint8Array.from(
  atob("R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7"),
  (c) => c.charCodeAt(0),
)

function emptyImage(status = 200): Response {
  return new Response(TRANSPARENT_GIF, {
    status,
    headers: {
      ...corsHeaders,
      "Content-Type": "image/gif",
      "Cache-Control": "no-store",
    },
  })
}

/** Blocks SSRF targets: non-http(s) schemes, localhost, and private/link-local IPs. */
function isBlockedTarget(target: URL): boolean {
  if (target.protocol !== "https:" && target.protocol !== "http:") return true

  const host = target.hostname.toLowerCase().replace(/^\[|\]$/g, "")
  if (
    host === "localhost" ||
    host === "0.0.0.0" ||
    host.endsWith(".localhost") ||
    host.endsWith(".internal") ||
    host.endsWith(".local")
  ) {
    return true
  }

  // IPv6 loopback / unique-local / link-local
  if (host === "::1" || host.startsWith("fc") || host.startsWith("fd") || host.startsWith("fe80")) {
    return true
  }

  const ipv4 = host.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/)
  if (ipv4) {
    const [a, b] = [Number(ipv4[1]), Number(ipv4[2])]
    if (a === 10 || a === 127 || a === 0) return true
    if (a === 172 && b >= 16 && b <= 31) return true
    if (a === 192 && b === 168) return true
    if (a === 169 && b === 254) return true // cloud metadata
    if (a >= 224) return true
  }

  return false
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders })
  }

  // Email bodies are customer data — only signed-in agents may proxy them.
  const auth = await requireUser(req)
  if ("response" in auth) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    })
  }

  const raw = new URL(req.url).searchParams.get("url")
  if (!raw) return emptyImage(400)

  let target: URL
  try {
    target = new URL(raw)
  } catch {
    return emptyImage(400)
  }

  if (isBlockedTarget(target)) {
    console.warn("[email-image-proxy] blocked target:", target.hostname)
    return emptyImage(400)
  }

  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS)

  try {
    const upstream = await fetch(target.toString(), {
      redirect: "follow",
      signal: controller.signal,
      headers: {
        // Never forward cookies or the agent's user agent.
        "User-Agent": "Mozilla/5.0 (compatible; SupportHubImageProxy/1.0)",
        Accept: "image/*,*/*;q=0.8",
      },
    })

    if (!upstream.ok) {
      console.warn(`[email-image-proxy] upstream ${upstream.status} for ${target.hostname}`)
      return emptyImage(200)
    }

    const contentType = upstream.headers.get("content-type") ?? ""
    if (!contentType.toLowerCase().startsWith("image/")) {
      console.warn("[email-image-proxy] non-image content-type:", contentType)
      return emptyImage(200)
    }

    const declared = Number(upstream.headers.get("content-length") ?? "0")
    if (declared > MAX_BYTES) return emptyImage(200)

    const buffer = new Uint8Array(await upstream.arrayBuffer())
    if (buffer.byteLength > MAX_BYTES) return emptyImage(200)

    return new Response(buffer, {
      status: 200,
      headers: {
        ...corsHeaders,
        "Content-Type": contentType,
        "Content-Length": String(buffer.byteLength),
        // Immutable per source URL — safe to cache in the browser.
        "Cache-Control": "private, max-age=86400",
        "X-Content-Type-Options": "nosniff",
      },
    })
  } catch (error) {
    console.error(
      "[email-image-proxy] fetch failed:",
      error instanceof Error ? error.message : error,
    )
    return emptyImage(200)
  } finally {
    clearTimeout(timer)
  }
})
