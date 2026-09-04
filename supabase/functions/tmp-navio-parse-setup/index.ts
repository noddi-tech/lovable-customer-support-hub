// Temporary one-off: register inbound.naviosolutions.com SendGrid Inbound Parse route.
// Fixed target, idempotent, no user input. Delete after use.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const HOSTNAME = "inbound.naviosolutions.com"
const DOMAIN = "naviosolutions.com"

Deno.serve(async () => {
  const sgKey = Deno.env.get("SENDGRID_API_KEY")
  const inboundToken = Deno.env.get("SENDGRID_INBOUND_TOKEN")
  const supabaseUrl = Deno.env.get("SUPABASE_URL")!
  if (!sgKey || !inboundToken) {
    return Response.json({ error: "missing sendgrid env" }, { status: 500 })
  }
  const url = `${supabaseUrl}/functions/v1/sendgrid-inbound?token=${inboundToken}`

  const listResp = await fetch("https://api.sendgrid.com/v3/user/webhooks/parse/settings", {
    headers: { Authorization: `Bearer ${sgKey}` },
  })
  const list = await listResp.json().catch(() => ({}))
  const existing = (list.result || []).find((w: any) => w.hostname === HOSTNAME)

  let action = "exists"
  let result: unknown = existing
  if (!existing) {
    const createResp = await fetch("https://api.sendgrid.com/v3/user/webhooks/parse/settings", {
      method: "POST",
      headers: { Authorization: `Bearer ${sgKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({ hostname: HOSTNAME, url, spam_check: true, send_raw: false }),
    })
    result = await createResp.json().catch(() => ({}))
    action = createResp.ok ? "created" : "create_failed"
  } else if (existing.url !== url) {
    const patchResp = await fetch(
      `https://api.sendgrid.com/v3/user/webhooks/parse/settings/${existing.hostname}`,
      {
        method: "PATCH",
        headers: { Authorization: `Bearer ${sgKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({ url, spam_check: true, send_raw: false }),
      },
    )
    result = await patchResp.json().catch(() => ({}))
    action = patchResp.ok ? "url_updated" : "url_update_failed"
  }

  const admin = createClient(supabaseUrl, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!)
  const dns_records = {
    mx: [{ host: HOSTNAME, type: "MX", value: "mx.sendgrid.net", priority: 10 }],
  }
  const { error: dbError } = await admin
    .from("email_domains")
    .update({ dns_records, status: action === "create_failed" ? "pending" : "active" })
    .eq("domain", DOMAIN)

  return Response.json({
    hostname: HOSTNAME,
    action,
    result,
    hostnames: (list.result || []).map((w: any) => w.hostname),
    dbError: dbError?.message ?? null,
  })
})
