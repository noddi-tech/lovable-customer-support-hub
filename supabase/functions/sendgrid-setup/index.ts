import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface SetupRequest {
  domain: string;          // e.g., suppas.io
  parse_subdomain: string; // e.g., inbound
  action?: 'validate' | 'validate_and_retry';
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    if (req.method !== "POST") {
      return new Response(JSON.stringify({ error: "Method not allowed" }), { status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return new Response(JSON.stringify({ error: "Invalid auth" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const body = await req.json() as SetupRequest;
    const domain = body.domain.trim().toLowerCase();
    const parse_subdomain = body.parse_subdomain.trim().toLowerCase();
    if (!domain || !parse_subdomain) {
      return new Response(JSON.stringify({ error: "domain and parse_subdomain required" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Get profile/org for the user
    const { data: profile, error: profileErr } = await supabase
      .from('profiles')
      .select('organization_id')
      .eq('user_id', user.id)
      .maybeSingle();
    if (profileErr || !profile?.organization_id) {
      return new Response(JSON.stringify({ error: "Profile/organization not found" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const organization_id = profile.organization_id as string;

    // Use service role for writes bypassing RLS checks in this admin workflow, DB policies still enforce org id.
    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const hostname = `${parse_subdomain}.${domain}`;

    // Configure SendGrid Inbound Parse via API (and ensure Sender Authentication exists)
    const sgKey = Deno.env.get('SENDGRID_API_KEY');
    const inboundToken = Deno.env.get('SENDGRID_INBOUND_TOKEN');
    if (!sgKey || !inboundToken) {
      return new Response(JSON.stringify({ error: "Missing SENDGRID_API_KEY or SENDGRID_INBOUND_TOKEN" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const inboundUrl = `https://${Deno.env.get('SUPABASE_URL')!.replace('https://', '')}/functions/v1/sendgrid-inbound?token=${inboundToken}`;

    async function createParseSetting() {
      const resp = await fetch('https://api.sendgrid.com/v3/user/webhooks/parse/settings', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${sgKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ hostname, url: inboundUrl, spam_check: true, send_raw: false, enable: true }),
      });
      const data = await resp.json().catch(() => ({}));
      return { ok: resp.ok, status: resp.status, data };
    }

    async function ensureSenderAuth() {
      // Check if sender auth exists for the domain
      const check = await fetch(`https://api.sendgrid.com/v3/whitelabel/domains?domain=${encodeURIComponent(domain)}&limit=1`, {
        headers: { 'Authorization': `Bearer ${sgKey}` },
      });
      const existing = await check.json().catch(() => []);
      if (Array.isArray(existing) && existing.length > 0) {
        return { created: false, record: existing[0] };
      }
      // Create sender auth (domain authentication)
      const create = await fetch('https://api.sendgrid.com/v3/whitelabel/domains', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${sgKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ domain, subdomain: 'em', automatic_security: true }),
      });
      const created = await create.json().catch(() => ({}));
      if (!create.ok) {
        return { created: false, record: null, error: created };
      }
      return { created: true, record: created };
    }
    
    async function findSenderAuth() {
      const check = await fetch(`https://api.sendgrid.com/v3/whitelabel/domains?domain=${encodeURIComponent(domain)}&limit=1`, {
        headers: { 'Authorization': `Bearer ${sgKey}` },
      });
      const list = await check.json().catch(() => []);
      return Array.isArray(list) && list.length > 0 ? list[0] : null;
    }
    
    async function validateSenderAuth(id: number) {
      const resp = await fetch(`https://api.sendgrid.com/v3/whitelabel/domains/${id}/validate`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${sgKey}` },
      });
      const data = await resp.json().catch(() => ({}));
      return { ok: resp.ok, status: resp.status, data };
    }
    
    // Handle explicit validation action
    if (body.action === 'validate' || body.action === 'validate_and_retry') {
      const existing = await findSenderAuth() ?? (await ensureSenderAuth()).record;
      if (!existing) {
        return new Response(JSON.stringify({ ok: false, error: 'sender_auth_not_found' }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      const validate = await validateSenderAuth(existing.id);
      const responsePayload: any = {
        ok: true,
        action: body.action,
        sender_auth: existing,
        validation: validate.data,
        sender_auth_valid: !!validate.data?.valid,
      };
      if (body.action === 'validate_and_retry' && !!validate.data?.valid) {
        // If valid now, immediately try to create parse
        const res = await createParseSetting();
        responsePayload.parse_attempt = res;
      }
      return new Response(JSON.stringify(responsePayload), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    
    // Try to create parse setting; if blocked by sender auth requirement, provision it then retry
    let parseResult = await createParseSetting();
    let authPayload: any = null;

    if (!parseResult.ok) {
      const msg = JSON.stringify(parseResult.data);
      if (msg.includes('matching senderauth domain')) {
        const auth = await ensureSenderAuth();
        authPayload = auth;
        // Retry once after creating sender auth
        parseResult = await createParseSetting();
      }
    }

    if (!parseResult.ok) {
      return new Response(JSON.stringify({
        ok: false,
        error: 'SendGrid API error',
        details: parseResult.data,
        hint: 'Complete Sender Authentication for this domain in DNS, then re-run. We attempted to create it automatically.',
        sender_auth: authPayload,
      }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Upsert domain record and return DNS instructions (MX + optionally sender auth records)
    const dns_records: any = {
      mx: [{ host: hostname, type: 'MX', value: 'mx.sendgrid.net', priority: 10 }],
    };
    if (authPayload?.record?.dns) {
      dns_records.sender_auth = authPayload.record.dns;
    }

    const { data: domainRow, error: domErr } = await admin
      .from('email_domains')
      .upsert({
        organization_id,
        domain,
        parse_subdomain,
        provider: 'sendgrid',
        dns_records,
        status: 'pending',
      }, { onConflict: 'organization_id,domain' })
      .select()
      .single();

    if (domErr) {
      return new Response(JSON.stringify({ error: domErr.message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    return new Response(JSON.stringify({
      ok: true,
      hostname,
      dns_records,
      parse_setting: parseResult.data,
      message: 'Add the MX record (and any sender auth records if shown). We will verify automatically.',
    }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (error) {
    console.error('sendgrid-setup error', error);
    return new Response(JSON.stringify({ error: String(error?.message || error) }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
