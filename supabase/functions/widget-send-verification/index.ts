import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

// Rate limiting: max 3 SMS per phone per 10 minutes
const smsRateMap = new Map<string, { count: number; resetAt: number }>();
const SMS_RATE_WINDOW_MS = 10 * 60_000;
const SMS_RATE_MAX = 3;

function isSmsRateLimited(phone: string): boolean {
  const now = Date.now();
  const entry = smsRateMap.get(phone);
  if (!entry || now > entry.resetAt) {
    smsRateMap.set(phone, { count: 1, resetAt: now + SMS_RATE_WINDOW_MS });
    return false;
  }
  entry.count++;
  return entry.count > SMS_RATE_MAX;
}

const API_BASE = (Deno.env.get("NODDI_API_BASE") || "https://api.noddi.co").replace(/\/+$/, "");

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response(
      JSON.stringify({ error: 'Method not allowed' }),
      { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }

  try {
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const NODDI_API_TOKEN = Deno.env.get('NODDI_API_TOKEN');

    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY || !NODDI_API_TOKEN) {
      return new Response(
        JSON.stringify({ error: 'Verification not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    const { widgetKey, phoneNumber, domain } = await req.json();

    if (!widgetKey || !phoneNumber) {
      return new Response(
        JSON.stringify({ error: 'widgetKey and phoneNumber are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    // Validate widget key
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const { data: widgetConfig } = await supabase
      .from('widget_configs')
      .select('id, is_active')
      .eq('widget_key', widgetKey)
      .eq('is_active', true)
      .single();

    if (!widgetConfig) {
      return new Response(
        JSON.stringify({ error: 'Widget not found or inactive' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    // Normalize phone: remove spaces, ensure +47 prefix (avoid double prefix)
    let cleanPhone = phoneNumber.replace(/\s+/g, '');
    // Remove leading +47 or 47 if present, then re-add +47
    cleanPhone = cleanPhone.replace(/^\+?47/, '');
    cleanPhone = `+47${cleanPhone}`;
    
    console.log('[widget-send-verification] Normalized phone:', cleanPhone);

    // Rate limit
    if (isSmsRateLimited(cleanPhone)) {
      return new Response(
        JSON.stringify({ error: 'Too many verification attempts. Please wait before trying again.' }),
        { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    // Call Noddi verification endpoint
    const requestUrl = `${API_BASE}/v1/users/send-phone-number-verification-v2/`;
    const phoneFinal = String(cleanPhone);
    const domainFinal = String(domain || 'noddi');
    const bodyObj = {
      botd_request_id: "",
      captcha_token: "",
      device_fingerprint: "",
      domain: domainFinal,
      force_send: false,
      phone_number: phoneFinal,
    };
    const bodyStr = JSON.stringify(bodyObj);
    
    console.log('[widget-send-verification] URL:', requestUrl);
    console.log('[widget-send-verification] Body:', bodyStr);
    console.log('[widget-send-verification] Token length:', NODDI_API_TOKEN.length, 'Token prefix:', NODDI_API_TOKEN.substring(0, 4));

    // Try JSON first
    let resp = await fetch(requestUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Token ${NODDI_API_TOKEN}`,
        'Accept': 'application/json',
        'Content-Type': 'application/json',
      },
      body: bodyStr,
    });

    // If JSON fails with 400, retry as form-encoded
    if (resp.status === 400) {
      console.log('[widget-send-verification] JSON body rejected, retrying as form-encoded');
      const formBody = new URLSearchParams();
      formBody.set('phone_number', phoneFinal);
      formBody.set('domain', domainFinal);
      formBody.set('botd_request_id', '');
      formBody.set('captcha_token', '');
      formBody.set('device_fingerprint', '');
      formBody.set('force_send', 'false');

      resp = await fetch(requestUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Token ${NODDI_API_TOKEN}`,
          'Accept': 'application/json',
        },
        body: formBody,
      });
    }

    const respText = await resp.text();
    console.log('[widget-send-verification] Response:', resp.status, respText);

    if (!resp.ok) {
      return new Response(
        JSON.stringify({ error: 'Failed to send verification code', debug_status: resp.status, debug_body: respText }),
        { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    let data = {};
    try { data = JSON.parse(respText); } catch (_) { /* non-JSON response */ }

    return new Response(
      JSON.stringify({ success: true, ...data }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  } catch (err) {
    console.error('[widget-send-verification] Error:', err);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }
});
