// PUBLIC: returns the status of one Meta data-deletion request by its exact
// confirmation code. No auth required (Meta links users straight here), but the
// underlying table stays unreadable to anon — lookup is service-role and
// scoped to a single exact code match.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"
import { corsHeaders } from "../_shared/cors.ts"

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  })
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    let code: string | null = new URL(req.url).searchParams.get("code")
    if (!code && req.method === "POST") {
      const body = await req.json().catch(() => ({}))
      code = typeof body?.code === "string" ? body.code : null
    }

    if (!code || code.length < 8 || code.length > 128) {
      return json({ error: "Invalid confirmation code" }, 400)
    }

    const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
      auth: { persistSession: false },
    })

    const { data, error } = await supabase
      .from("recruitment_meta_data_deletion_requests")
      .select("confirmation_code, status, created_at, completed_at")
      .eq("confirmation_code", code)
      .maybeSingle()

    if (error) {
      console.error("[meta-deletion-status] lookup failed:", error.message)
      return json({ error: "Lookup failed" }, 500)
    }

    return json({ request: data ?? null })
  } catch (err) {
    console.error("[meta-deletion-status] fatal:", err)
    return json({ error: "Unexpected error" }, 500)
  }
})
