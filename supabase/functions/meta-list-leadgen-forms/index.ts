// meta-list-leadgen-forms
// Authenticated. Returns lead-gen forms for a configured integration's page,
// using the server-side page_access_token. The token is never sent to the client.
// On pages_manage_ads scope error returns { forms: null, scope_missing: true } so
// the wizard can render a graceful fallback.
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const GRAPH = 'https://graph.facebook.com/v25.0';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

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
    const { data: userData } = await userClient.auth.getUser();
    if (!userData?.user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const admin = createClient(SUPABASE_URL, SERVICE);
    const { data: profile } = await admin
      .from('profiles')
      .select('organization_id')
      .eq('user_id', userData.user.id)
      .maybeSingle();
    if (!profile?.organization_id) {
      return new Response(JSON.stringify({ error: 'Forbidden' }), {
        status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const body = await req.json().catch(() => ({}));
    const integrationId = body?.integration_id as string | undefined;
    if (!integrationId) {
      return new Response(JSON.stringify({ error: 'integration_id required' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { data: integration } = await admin
      .from('recruitment_meta_integrations')
      .select('id, organization_id, page_id, page_access_token')
      .eq('id', integrationId)
      .maybeSingle();
    if (!integration || integration.organization_id !== profile.organization_id) {
      return new Response(JSON.stringify({ error: 'Integration not found' }), {
        status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    if (!integration.page_access_token) {
      return new Response(JSON.stringify({ error: 'Mangler page access token' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const r = await fetch(
      `${GRAPH}/${integration.page_id}/leadgen_forms?fields=id,name,status,created_time&limit=200&access_token=${encodeURIComponent(integration.page_access_token)}`
    );
    const data = await r.json().catch(() => ({}));

    if (!r.ok) {
      const msg: string = data?.error?.message ?? `HTTP ${r.status}`;
      const code = data?.error?.code;
      const sub = data?.error?.error_subcode;
      const looksLikeScope =
        /pages_manage_ads/i.test(msg) ||
        /permission/i.test(msg) ||
        code === 200 || code === 10 || code === 100 || sub === 33;
      if (looksLikeScope) {
        return new Response(JSON.stringify({
          forms: null,
          scope_missing: true,
          error_message: msg,
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      return new Response(JSON.stringify({ error: msg }), {
        status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const forms = (data?.data ?? []).map((f: any) => ({
      id: String(f.id),
      name: String(f.name ?? ''),
      status: String(f.status ?? ''),
      created_time: f.created_time ?? null,
    }));

    return new Response(JSON.stringify({ forms, scope_missing: false }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (e: any) {
    console.error('[meta-list-leadgen-forms] error', e);
    return new Response(JSON.stringify({ error: e?.message ?? 'Internal error' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
