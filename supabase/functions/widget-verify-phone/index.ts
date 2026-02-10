import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

// PIN attempt limiting: max 5 per phone per session
const pinAttemptMap = new Map<string, number>();
const PIN_MAX_ATTEMPTS = 5;

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

    const { widgetKey, phoneNumber, pin, conversationId } = await req.json();

    if (!widgetKey || !phoneNumber || !pin) {
      return new Response(
        JSON.stringify({ error: 'widgetKey, phoneNumber, and pin are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    const cleanPhone = phoneNumber.replace(/\s+/g, '').replace(/^(\+?47)?/, '+47');

    // Check attempt count
    const attempts = pinAttemptMap.get(cleanPhone) || 0;
    if (attempts >= PIN_MAX_ATTEMPTS) {
      return new Response(
        JSON.stringify({ verified: false, error: 'Too many attempts. Please request a new code.', attemptsRemaining: 0 }),
        { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
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

    // Verify PIN with Noddi API
    // Try the standard verification endpoint pattern
    const resp = await fetch(`${API_BASE}/v1/users/verify-phone-number/`, {
      method: 'POST',
      headers: {
        'Authorization': `Token ${NODDI_API_TOKEN}`,
        'Accept': 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ phone_number: cleanPhone, code: pin }),
    });

    if (!resp.ok) {
      pinAttemptMap.set(cleanPhone, attempts + 1);
      const remaining = PIN_MAX_ATTEMPTS - (attempts + 1);

      if (resp.status === 400) {
        return new Response(
          JSON.stringify({ verified: false, error: 'Invalid code', attemptsRemaining: remaining }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
        );
      }

      const errorBody = await resp.text();
      console.error('[widget-verify-phone] Noddi API error:', resp.status, errorBody);
      return new Response(
        JSON.stringify({ verified: false, error: 'Verification failed', attemptsRemaining: remaining }),
        { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    // Success (HTTP 200/201) - reset attempts
    pinAttemptMap.delete(cleanPhone);

    // Parse response - token/user may be null for new users, but verification still succeeded
    const respData = await resp.json().catch(() => ({}));

    // Update conversation record if provided
    if (conversationId) {
      await supabase
        .from('widget_ai_conversations')
        .update({
          phone_verified: true,
          visitor_phone: cleanPhone,
          updated_at: new Date().toISOString(),
        })
        .eq('id', conversationId);
    }

    return new Response(
      JSON.stringify({ verified: true, token: respData.token || null }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  } catch (err) {
    console.error('[widget-verify-phone] Error:', err);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }
});
