// Meta Integration Health Check
// Runs auth/subscription/lead-retrieval probes against Graph API and persists cached result.
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const GRAPH = 'https://graph.facebook.com/v19.0';
const REQUIRED_SCOPES = [
  'leads_retrieval',
  'pages_show_list',
  'pages_read_engagement',
  'pages_manage_metadata',
  'pages_manage_ads',
];

interface HealthResult {
  auth: {
    valid: boolean;
    is_page_token: boolean;
    page_id_match: boolean;
    owner_id: string | null;
    owner_name: string | null;
    scopes_present: string[];
    scopes_missing: string[];
    error?: string | null;
  };
  webhook: {
    subscription_active: boolean;
    last_event_at: string | null;
    events_24h: { success: number; failed: number; duplicate: number; invalid: number };
    error?: string | null;
  };
  lead_retrieval: {
    can_fetch_forms: boolean;
    last_success_at: string | null;
    last_error: string | null;
    tested_form_id?: string | null;
  };
  subscription: { leadgen_subscribed: boolean };
  token_expires_at: string | null;
  overall_status: 'healthy' | 'degraded' | 'broken';
  status_message: string | null;
  checked_at: string;
}

async function fetchJson(url: string): Promise<{ ok: boolean; status: number; data: any; error?: string }> {
  try {
    const r = await fetch(url);
    const data = await r.json().catch(() => ({}));
    if (!r.ok) {
      return { ok: false, status: r.status, data, error: data?.error?.message ?? `HTTP ${r.status}` };
    }
    return { ok: true, status: r.status, data };
  } catch (e: any) {
    return { ok: false, status: 0, data: null, error: e?.message ?? 'Network error' };
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
    const ANON = Deno.env.get('SUPABASE_ANON_KEY')!;
    const SERVICE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const META_APP_ID = Deno.env.get('META_APP_ID')!;
    const META_APP_SECRET = Deno.env.get('META_APP_SECRET')!;

    const userClient = createClient(SUPABASE_URL, ANON, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: claims, error: claimsError } = await userClient.auth.getClaims(authHeader.replace('Bearer ', ''));
    if (claimsError || !claims?.claims) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const body = await req.json().catch(() => ({}));
    const integrationId = body?.integration_id as string | undefined;
    if (!integrationId || typeof integrationId !== 'string') {
      return new Response(JSON.stringify({ error: 'integration_id required' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const admin = createClient(SUPABASE_URL, SERVICE);

    // Load integration with org check via user's profile
    const { data: integration, error: intErr } = await admin
      .from('recruitment_meta_integrations')
      .select('*')
      .eq('id', integrationId)
      .maybeSingle();
    if (intErr || !integration) {
      return new Response(JSON.stringify({ error: 'Integration not found' }), {
        status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Confirm caller is in same org
    const userId = claims.claims.sub as string;
    const { data: profile } = await admin
      .from('profiles')
      .select('organization_id')
      .eq('user_id', userId)
      .maybeSingle();
    if (!profile || profile.organization_id !== integration.organization_id) {
      return new Response(JSON.stringify({ error: 'Forbidden' }), {
        status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const TOKEN = integration.page_access_token;
    if (!TOKEN) {
      const result: HealthResult = {
        auth: { valid: false, is_page_token: false, page_id_match: false, owner_id: null, owner_name: null,
                scopes_present: [], scopes_missing: REQUIRED_SCOPES, error: 'Ingen page access token lagret' },
        webhook: { subscription_active: false, last_event_at: integration.last_event_at, events_24h: { success: 0, failed: 0, duplicate: 0, invalid: 0 } },
        lead_retrieval: { can_fetch_forms: false, last_success_at: null, last_error: 'Ingen token' },
        subscription: { leadgen_subscribed: false },
        token_expires_at: null,
        overall_status: 'broken',
        status_message: 'Ingen page access token lagret',
        checked_at: new Date().toISOString(),
      };
      await admin.from('recruitment_meta_integrations').update({
        last_health_check_at: result.checked_at,
        last_health_check_result: result,
        token_expires_at: null,
        status: 'error',
        status_message: result.status_message,
      }).eq('id', integrationId);
      return new Response(JSON.stringify(result), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // A. /me/permissions  + B. /me  + C. debug_token  + D. subscribed_apps  in parallel
    const APP_ACCESS = `${META_APP_ID}|${META_APP_SECRET}`;
    const [permsRes, meRes, debugRes, subsRes] = await Promise.all([
      fetchJson(`${GRAPH}/me/permissions?access_token=${encodeURIComponent(TOKEN)}`),
      fetchJson(`${GRAPH}/me?fields=id,name&access_token=${encodeURIComponent(TOKEN)}`),
      fetchJson(`${GRAPH}/debug_token?input_token=${encodeURIComponent(TOKEN)}&access_token=${encodeURIComponent(APP_ACCESS)}`),
      fetchJson(`${GRAPH}/${integration.page_id}/subscribed_apps?access_token=${encodeURIComponent(TOKEN)}`),
    ]);

    // Auth section
    let scopes_present: string[] = [];
    let scopes_missing: string[] = [...REQUIRED_SCOPES];
    let authValid = permsRes.ok;
    let authError: string | null = permsRes.error ?? null;
    if (permsRes.ok && Array.isArray(permsRes.data?.data)) {
      const granted = new Set(
        permsRes.data.data.filter((p: any) => p.status === 'granted').map((p: any) => p.permission)
      );
      scopes_present = REQUIRED_SCOPES.filter((s) => granted.has(s));
      scopes_missing = REQUIRED_SCOPES.filter((s) => !granted.has(s));
    }

    const owner_id = meRes.ok ? (meRes.data?.id ?? null) : null;
    const owner_name = meRes.ok ? (meRes.data?.name ?? null) : null;
    const page_id_match = !!owner_id && owner_id === integration.page_id;
    const is_page_token = page_id_match; // /me returning the page id => Page Access Token

    // Token expiry from debug_token
    let tokenExpiresAt: string | null = null;
    if (debugRes.ok) {
      const expiresAt = debugRes.data?.data?.expires_at;
      if (typeof expiresAt === 'number' && expiresAt > 0) {
        tokenExpiresAt = new Date(expiresAt * 1000).toISOString();
      }
    }

    // D. Subscription
    let leadgen_subscribed = false;
    if (subsRes.ok && Array.isArray(subsRes.data?.data)) {
      leadgen_subscribed = subsRes.data.data.some((app: any) => {
        const fields = app?.subscribed_fields ?? [];
        const matchesApp = String(app?.id) === String(META_APP_ID);
        return matchesApp && Array.isArray(fields) && fields.includes('leadgen');
      });
      // Fallback: any app subscribed to leadgen counts (covers app-id mismatch on legacy setups)
      if (!leadgen_subscribed) {
        leadgen_subscribed = subsRes.data.data.some((app: any) =>
          Array.isArray(app?.subscribed_fields) && app.subscribed_fields.includes('leadgen')
        );
      }
    }

    // E. Lead retrieval test against first active form mapping
    const { data: mappings } = await admin
      .from('recruitment_meta_form_mappings')
      .select('form_id, form_name, is_active')
      .eq('integration_id', integrationId)
      .eq('is_active', true)
      .limit(1);
    const firstForm = mappings?.[0];
    let lead_retrieval = {
      can_fetch_forms: false,
      last_success_at: null as string | null,
      last_error: null as string | null,
      tested_form_id: firstForm?.form_id ?? null,
    };
    if (firstForm?.form_id) {
      const r = await fetchJson(
        `${GRAPH}/${firstForm.form_id}/leads?limit=1&access_token=${encodeURIComponent(TOKEN)}`
      );
      lead_retrieval.can_fetch_forms = r.ok;
      lead_retrieval.last_success_at = r.ok ? new Date().toISOString() : null;
      lead_retrieval.last_error = r.ok ? null : (r.error ?? `HTTP ${r.status}`);
    } else {
      lead_retrieval.last_error = 'Ingen aktive skjema-mappinger å teste mot';
    }

    // F + G. event stats (24h) + last event
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const { data: logRows } = await admin
      .from('recruitment_lead_ingestion_log')
      .select('status, created_at')
      .eq('integration_id', integrationId)
      .gte('created_at', since);
    const events_24h = { success: 0, failed: 0, duplicate: 0, invalid: 0 };
    for (const row of logRows ?? []) {
      const s = row.status as keyof typeof events_24h;
      if (s in events_24h) events_24h[s]++;
    }
    const { data: lastLog } = await admin
      .from('recruitment_lead_ingestion_log')
      .select('created_at')
      .eq('integration_id', integrationId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    const candidates = [integration.last_event_at, lastLog?.created_at].filter(Boolean) as string[];
    const last_event_at = candidates.length
      ? candidates.sort().reverse()[0]
      : null;

    // Overall status
    const authBroken = !authValid || !is_page_token || scopes_missing.length > 0;
    const subscriptionBroken = !leadgen_subscribed;
    let overall_status: HealthResult['overall_status'];
    let status_message: string | null = null;
    if (authBroken || subscriptionBroken) {
      overall_status = 'broken';
      const reasons: string[] = [];
      if (!authValid) reasons.push('token ugyldig');
      if (!is_page_token) reasons.push('ikke en Side-token');
      if (scopes_missing.length > 0) reasons.push(`mangler: ${scopes_missing.join(', ')}`);
      if (subscriptionBroken) reasons.push('webhook-abonnement inaktivt');
      status_message = `Brutt — ${reasons.join('; ')}`;
    } else if (events_24h.failed > events_24h.success && events_24h.failed > 0) {
      overall_status = 'degraded';
      status_message = `Flere feil enn vellykkede siste 24t (${events_24h.failed} vs ${events_24h.success})`;
    } else {
      overall_status = 'healthy';
      status_message = null;
    }

    const result: HealthResult = {
      auth: { valid: authValid, is_page_token, page_id_match, owner_id, owner_name,
              scopes_present, scopes_missing, error: authError },
      webhook: { subscription_active: leadgen_subscribed, last_event_at, events_24h },
      lead_retrieval,
      subscription: { leadgen_subscribed },
      token_expires_at: tokenExpiresAt,
      overall_status,
      status_message,
      checked_at: new Date().toISOString(),
    };

    await admin.from('recruitment_meta_integrations').update({
      last_health_check_at: result.checked_at,
      last_health_check_result: result,
      token_expires_at: tokenExpiresAt,
      status: overall_status === 'broken' ? 'error' : 'connected',
      status_message,
    }).eq('id', integrationId);

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (e: any) {
    console.error('[meta-integration-health-check] error', e);
    return new Response(JSON.stringify({ error: e?.message ?? 'Internal error' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
