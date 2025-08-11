import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface SetupRequest {
  domain: string;          // e.g., suppas.io
  parse_subdomain: string; // e.g., inbound
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

    // Configure SendGrid Inbound Parse via API
    const sgKey = Deno.env.get('SENDGRID_API_KEY');
    const inboundToken = Deno.env.get('SENDGRID_INBOUND_TOKEN');
    if (!sgKey || !inboundToken) {
      return new Response(JSON.stringify({ error: "Missing SENDGRID_API_KEY or SENDGRID_INBOUND_TOKEN" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const inboundUrl = `https://${Deno.env.get('SUPABASE_URL')!.replace('https://', '')}/functions/v1/sendgrid-inbound?token=${inboundToken}`;

    const sgResp = await fetch('https://api.sendgrid.com/v3/user/webhooks/parse/settings', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${sgKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        hostname,
        url: inboundUrl,
        spam_check: true,
        send_raw: false,
        enable: true,
        // set_tls: 1,  // optional strict TLS
      }),
    });

    const sgData = await sgResp.json();
    if (!sgResp.ok) {
      return new Response(JSON.stringify({ error: 'SendGrid API error', details: sgData }), { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Upsert domain record
    const dns_records = {
      mx: [{ host: hostname, type: 'MX', value: 'mx.sendgrid.net', priority: 10 }],
    };

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
      parse_setting: sgData,
      message: 'Configure the MX record above on your DNS. We will verify automatically.',
    }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (error) {
    console.error('sendgrid-setup error', error);
    return new Response(JSON.stringify({ error: String(error?.message || error) }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
