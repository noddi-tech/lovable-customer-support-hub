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
const MCP_URL = Deno.env.get("MCP_URL") || "https://mcp.noddi.co/mcp";

/** Call a tool on the Navio MCP server */
async function callMcpTool(name: string, args: Record<string, any>): Promise<any> {
  const resp = await fetch(MCP_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json, text/event-stream',
    },
    body: JSON.stringify({
      jsonrpc: '2.0',
      id: crypto.randomUUID(),
      method: 'tools/call',
      params: { name, arguments: args },
    }),
  });
  if (!resp.ok) throw new Error(`MCP HTTP ${resp.status}`);
  const contentType = resp.headers.get('content-type') || '';
  if (contentType.includes('text/event-stream')) {
    const text = await resp.text();
    for (const line of text.split('\n')) {
      if (line.startsWith('data: ')) {
        try {
          const parsed = JSON.parse(line.slice(6));
          if (parsed.result) {
            if (parsed.result.isError) throw new Error(parsed.result.content?.[0]?.text || 'MCP error');
            const tb = parsed.result.content?.find((c: any) => c.type === 'text');
            if (tb?.text) { try { return JSON.parse(tb.text); } catch { return tb.text; } }
            return parsed.result;
          }
          if (parsed.error) throw new Error(parsed.error.message);
        } catch (e) { if ((e as Error).message?.startsWith('MCP')) throw e; }
      }
    }
    throw new Error('MCP: no result');
  }
  const data = await resp.json();
  if (data.error) throw new Error(data.error.message);
  const tb = data.result?.content?.find((c: any) => c.type === 'text');
  if (tb?.text) { try { return JSON.parse(tb.text); } catch { return tb.text; } }
  return data.result || data;
}

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

    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
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

    // Try MCP first, fall back to direct Noddi API
    let verified = false;
    let authToken: string | null = null;
    let token: string | null = null;

    try {
      console.log('[widget-verify-phone] Trying MCP login_phone_code_exchange for', cleanPhone);
      const mcpResult = await callMcpTool('login_phone_code_exchange', {
        phone_number: cleanPhone,
        code: pin,
      });
      console.log('[widget-verify-phone] MCP success, has auth_token:', !!mcpResult?.auth_token);
      verified = true;
      authToken = mcpResult?.auth_token || null;
      token = mcpResult?.token || mcpResult?.auth_token || null;
    } catch (mcpErr) {
      console.warn('[widget-verify-phone] MCP failed, falling back to direct API:', (mcpErr as Error).message);

      // Fallback: direct Noddi API
      if (!NODDI_API_TOKEN) {
        pinAttemptMap.set(cleanPhone, attempts + 1);
        return new Response(
          JSON.stringify({ verified: false, error: 'Verification not configured', attemptsRemaining: PIN_MAX_ATTEMPTS - (attempts + 1) }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
        );
      }

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

      const respData = await resp.json().catch(() => ({}));
      verified = true;
      token = respData.token || null;
    }

    if (!verified) {
      pinAttemptMap.set(cleanPhone, attempts + 1);
      return new Response(
        JSON.stringify({ verified: false, error: 'Invalid code', attemptsRemaining: PIN_MAX_ATTEMPTS - (attempts + 1) }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    // Success - reset attempts
    pinAttemptMap.delete(cleanPhone);

    // Update conversation record if provided — store auth_token for MCP calls
    if (conversationId) {
      const updateData: any = {
        phone_verified: true,
        visitor_phone: cleanPhone,
        updated_at: new Date().toISOString(),
      };
      // Store auth_token in conversation metadata for subsequent MCP tool calls
      if (authToken) {
        updateData.metadata = { mcp_auth_token: authToken };
      }
      await supabase
        .from('widget_ai_conversations')
        .update(updateData)
        .eq('id', conversationId);
    }

    return new Response(
      JSON.stringify({ verified: true, token: token || null, auth_token: authToken || null }),
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
