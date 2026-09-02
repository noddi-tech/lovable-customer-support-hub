// Shared IP/key based rate limiting backed by public.rate_limit_tracking.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? ""
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""

export function clientIp(req: Request): string {
  const fwd = req.headers.get("x-forwarded-for")
  if (fwd) return fwd.split(",")[0].trim()
  return req.headers.get("cf-connecting-ip") ?? "unknown"
}

/**
 * Returns true when the request is allowed, false when the limit is exceeded.
 * Fails open on infrastructure errors so a DB hiccup cannot take the widget down.
 */
export async function checkRateLimit(
  key: string,
  limit: number,
  windowSeconds: number,
): Promise<boolean> {
  try {
    const client = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, { auth: { persistSession: false } })
    const { data, error } = await client.rpc("check_rate_limit", {
      _key: key,
      _limit: limit,
      _window_seconds: windowSeconds,
    })
    if (error) {
      console.error("[rate-limit] rpc error", error.message)
      return true
    }
    return data !== false
  } catch (e) {
    console.error("[rate-limit] unexpected error", e)
    return true
  }
}

export function rateLimitResponse(corsHeaders: Record<string, string>): Response {
  return new Response(
    JSON.stringify({ error: "Too many requests. Please slow down and try again shortly." }),
    {
      status: 429,
      headers: { ...corsHeaders, "Content-Type": "application/json", "Retry-After": "60" },
    },
  )
}
