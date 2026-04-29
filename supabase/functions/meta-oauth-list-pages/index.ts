// meta-oauth-list-pages
// Authenticated. Returns the FB pages the OAuth user manages, using the
// long-lived user token stashed on the oauth_states row. Page tokens are
// NOT returned to the client.
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
    const stateId = body?.state_id;
    if (!stateId) {
      return new Response(JSON.stringify({ error: 'state_id required' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { data: state } = await admin
      .from('recruitment_meta_oauth_states')
      .select('id, organization_id, long_lived_user_token, oauth_user_id, oauth_user_name, token_expires_at, mode, existing_integration_id')
      .eq('id', stateId)
      .maybeSingle();
    if (!state || state.organization_id !== profile.organization_id) {
      return new Response(JSON.stringify({ error: 'State not found' }), {
        status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    if (!state.long_lived_user_token) {
      return new Response(JSON.stringify({ error: 'OAuth not completed' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const META_APP_ID = Deno.env.get('META_APP_ID')!;
    const META_APP_SECRET = Deno.env.get('META_APP_SECRET')!;
    const appAccessToken = `${META_APP_ID}|${META_APP_SECRET}`;

    // Run /me/accounts and debug_token in parallel for snappier UX.
    const [pagesRes, debugRes] = await Promise.all([
      fetch(
        `${GRAPH}/me/accounts?fields=id,name,access_token,tasks&limit=200&access_token=${encodeURIComponent(state.long_lived_user_token)}`
      ),
      fetch(
        `${GRAPH}/debug_token?input_token=${encodeURIComponent(state.long_lived_user_token)}&access_token=${encodeURIComponent(appAccessToken)}`
      ),
    ]);
    const data = await pagesRes.json().catch(() => ({}));
    if (!pagesRes.ok) {
      return new Response(JSON.stringify({
        error: data?.error?.message ?? `HTTP ${pagesRes.status}`,
      }), {
        status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const pages = (data?.data ?? []).map((p: any) => ({
      id: String(p.id),
      name: String(p.name ?? ''),
      can_manage: Array.isArray(p.tasks) && p.tasks.includes('MANAGE'),
    }));

    let granted_scopes: string[] = [];
    try {
      const debugData = await debugRes.json();
      const scopes = debugData?.data?.scopes;
      if (Array.isArray(scopes)) granted_scopes = scopes.map((s: any) => String(s));
    } catch {
      // Non-fatal — wizard will fall back to "expected" rendering if empty.
    }

    return new Response(JSON.stringify({
      pages,
      granted_scopes,
      oauth_user_id: state.oauth_user_id,
      oauth_user_name: state.oauth_user_name,
      token_expires_at: state.token_expires_at,
      mode: state.mode,
      existing_integration_id: state.existing_integration_id,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (e: any) {
    console.error('[meta-oauth-list-pages] error', e);
    return new Response(JSON.stringify({ error: e?.message ?? 'Internal error' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
