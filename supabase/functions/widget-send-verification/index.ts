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

    const { widgetKey, phoneNumber } = await req.json();

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

    // Normalize phone
    const cleanPhone = phoneNumber.replace(/\s+/g, '').replace(/^(\+?47)?/, '+47');

    // Rate limit
    if (isSmsRateLimited(cleanPhone)) {
      return new Response(
        JSON.stringify({ error: 'Too many verification attempts. Please wait before trying again.' }),
        { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    // Call Noddi verification endpoint
    const resp = await fetch(`${API_BASE}/v1/users/send-phone-number-verification-v2/`, {
      method: 'POST',
      headers: {
        'Authorization': `Token ${NODDI_API_TOKEN}`,
        'Accept': 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ phone_number: cleanPhone }),
    });

    if (!resp.ok) {
      const errorBody = await resp.text();
      console.error('[widget-send-verification] Noddi API error:', resp.status, errorBody);
      return new Response(
        JSON.stringify({ error: 'Failed to send verification code' }),
        { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    const data = await resp.json();

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
