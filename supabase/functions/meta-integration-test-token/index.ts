// Validates a candidate Page Access Token without persisting it.
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

async function fetchJson(url: string) {
  try {
    const r = await fetch(url);
    const data = await r.json().catch(() => ({}));
    return { ok: r.ok, status: r.status, data, error: r.ok ? null : (data?.error?.message ?? `HTTP ${r.status}`) };
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

    const userClient = createClient(SUPABASE_URL, ANON, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData, error: userError } = await userClient.auth.getUser();
    if (userError || !userData?.user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const body = await req.json().catch(() => ({}));
    const integrationId = body?.integration_id as string | undefined;
    const candidateToken = body?.candidate_token as string | undefined;
    if (!integrationId || !candidateToken || typeof candidateToken !== 'string' || candidateToken.length < 20) {
      return new Response(JSON.stringify({ error: 'integration_id and candidate_token required' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const admin = createClient(SUPABASE_URL, SERVICE);
    const { data: integration } = await admin
      .from('recruitment_meta_integrations')
      .select('id, page_id, page_name, organization_id')
      .eq('id', integrationId)
      .maybeSingle();
    if (!integration) {
      return new Response(JSON.stringify({ error: 'Integration not found' }), {
        status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

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

    const [permsRes, meRes] = await Promise.all([
      fetchJson(`${GRAPH}/me/permissions?access_token=${encodeURIComponent(candidateToken)}`),
      fetchJson(`${GRAPH}/me?fields=id,name&access_token=${encodeURIComponent(candidateToken)}`),
    ]);

    if (!meRes.ok || !permsRes.ok) {
      return new Response(JSON.stringify({
        valid: false,
        is_page_token: false,
        page_id_match: false,
        owner_id: meRes.data?.id ?? null,
        owner_name: meRes.data?.name ?? null,
        scopes_present: [],
        scopes_missing: REQUIRED_SCOPES,
        error_summary: meRes.error ?? permsRes.error ?? 'Token kunne ikke valideres',
      }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const owner_id = meRes.data?.id ?? null;
    const owner_name = meRes.data?.name ?? null;
    const page_id_match = !!owner_id && String(owner_id) === String(integration.page_id);
    const is_page_token = page_id_match;

    const granted = new Set(
      (permsRes.data?.data ?? [])
        .filter((p: any) => p.status === 'granted')
        .map((p: any) => p.permission)
    );
    const scopes_present = REQUIRED_SCOPES.filter((s) => granted.has(s));
    const scopes_missing = REQUIRED_SCOPES.filter((s) => !granted.has(s));

    let valid = true;
    let error_summary: string | null = null;
    if (!is_page_token) {
      valid = false;
      error_summary = `Token er knyttet til "${owner_name ?? 'ukjent'}" (ID ${owner_id}), ikke siden "${integration.page_name}" (ID ${integration.page_id}). Du må generere en Side-token.`;
    } else if (scopes_missing.length > 0) {
      valid = false;
      error_summary = `Tokenet mangler nødvendige tilganger: ${scopes_missing.join(', ')}`;
    }

    return new Response(JSON.stringify({
      valid,
      is_page_token,
      page_id_match,
      owner_id,
      owner_name,
      scopes_present,
      scopes_missing,
      error_summary,
    }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (e: any) {
    console.error('[meta-integration-test-token] error', e);
    return new Response(JSON.stringify({ error: e?.message ?? 'Internal error' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
