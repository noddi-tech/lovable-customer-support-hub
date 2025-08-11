import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function extractEmail(value?: string | null): string | null {
  if (!value) return null;
  const match = value.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i);
  return match ? match[0].toLowerCase() : null;
}

function parseHeaderValue(headersRaw?: string | null, name?: string): string | null {
  if (!headersRaw || !name) return null;
  const regex = new RegExp(`^${name}:\s*(.+)$`, "im");
  const m = headersRaw.match(regex);
  return m ? m[1].trim() : null;
}

function getThreadKey(headersRaw?: string | null): string | null {
  const inReply = parseHeaderValue(headersRaw, "In-Reply-To");
  const references = parseHeaderValue(headersRaw, "References");
  const messageId = parseHeaderValue(headersRaw, "Message-ID") || parseHeaderValue(headersRaw, "Message-Id");
  const refFirst = references ? (references.match(/<[^>]+>/g)?.[0] || references) : null;
  return (inReply || refFirst || messageId || null)?.replace(/[<>]/g, "");
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const token = url.searchParams.get("token");
    const expected = Deno.env.get("SENDGRID_INBOUND_TOKEN");
    if (!expected || token !== expected) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const form = await req.formData();
    const toRaw = String(form.get("to") || "");
    const fromRaw = String(form.get("from") || "");
    const subject = String(form.get("subject") || "");
    const html = form.get("html") ? String(form.get("html")) : null;
    const text = form.get("text") ? String(form.get("text")) : null;
    const headersRaw = form.get("headers") ? String(form.get("headers")) : null;
    const envelopeStr = form.get("envelope") ? String(form.get("envelope")) : null;

    const headerTo = extractEmail(toRaw);
    const fromEmail = extractEmail(fromRaw);

    // Use the SMTP envelope recipient when present (Google Group forwarding keeps To: as public address)
    let rcptEmail: string | null = headerTo;
    let envelope: any = null;
    try {
      envelope = envelopeStr ? JSON.parse(envelopeStr) : null;
      const envToCandidate = typeof envelope?.to === 'string' ? envelope.to : (Array.isArray(envelope?.to) ? envelope.to[0] : null);
      const envTo = extractEmail(envToCandidate);
      if (envTo) rcptEmail = envTo;
    } catch {}

    if (!rcptEmail || !fromEmail) {
      return new Response(JSON.stringify({ error: "Missing to/from", headerTo, rcptEmail }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Lookup inbound route using the actual SMTP recipient (rcptEmail)
    const { data: route, error: routeError } = await supabase
      .from("inbound_routes")
      .select("*, domain:email_domains(*)")
      .eq("address", rcptEmail)
      .maybeSingle();

    if (routeError || !route) {
      return new Response(JSON.stringify({ error: "Route not found", rcptEmail, headerTo, details: routeError?.message }), { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const organization_id = route.organization_id as string;
    const inbox_id = route.inbox_id as string | null;

    // Find or create customer
    const { data: customerExisting } = await supabase
      .from("customers")
      .select("id")
      .eq("email", fromEmail)
      .eq("organization_id", organization_id)
      .maybeSingle();

    let customer_id = customerExisting?.id as string | null;
    if (!customer_id) {
      const fullNameGuess = fromRaw.replace(/<.*>/, "").trim() || fromEmail.split("@")[0];
      const { data: inserted, error: insErr } = await supabase
        .from("customers")
        .insert({ email: fromEmail, full_name: fullNameGuess, organization_id })
        .select("id")
        .single();
      if (insErr) throw insErr;
      customer_id = inserted.id;
    }

    // Find or create conversation by thread key
    const threadKey = getThreadKey(headersRaw) || `sg_${crypto.randomUUID()}`;

    const { data: existingConv } = await supabase
      .from("conversations")
      .select("id")
      .eq("external_id", threadKey)
      .eq("organization_id", organization_id)
      .maybeSingle();

    let conversation_id = existingConv?.id as string | null;
    if (!conversation_id) {
      const { data: convIns, error: convErr } = await supabase
        .from("conversations")
        .insert({
          subject: subject || null,
          channel: "email",
          organization_id,
          inbox_id,
          customer_id,
          external_id: threadKey,
          received_at: new Date().toISOString(),
        })
        .select("id")
        .single();
      if (convErr) throw convErr;
      conversation_id = convIns.id;
    }

    // Insert message
    const contentHtml = html || (text ? `<pre>${text}</pre>` : "");
    const contentType = html ? "html" : (text ? "text" : "html");

    const headersObj = headersRaw ? { raw: headersRaw } : null;
    const { error: msgErr } = await supabase
      .from("messages")
      .insert({
        conversation_id,
        is_internal: false,
        sender_type: "customer",
        content: contentHtml,
        content_type: contentType,
        email_subject: subject || null,
        email_headers: headersObj,
        external_id: threadKey,
      });
    if (msgErr) throw msgErr;

    return new Response(JSON.stringify({ ok: true }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (error) {
    console.error("sendgrid-inbound error", error);
    return new Response(JSON.stringify({ error: String(error?.message || error) }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
