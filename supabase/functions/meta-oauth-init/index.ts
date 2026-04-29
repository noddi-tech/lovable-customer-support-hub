// meta-oauth-init
// Authenticated. Generates a CSRF nonce, stores an oauth_states row with the
// caller's browser origin, returns the Facebook OAuth URL to redirect to.
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';
import { isAllowedOrigin } from '../_shared/meta-origin.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, origin',
};

const FB_OAUTH = 'https://www.facebook.com/v25.0/dialog/oauth';
const SCOPES = [
  'leads_retrieval',
  'pages_show_list',
  'pages_read_engagement',
  'pages_manage_metadata',
  'pages_manage_ads',
].join(',');

function nonceHex(bytes = 32): string {
  const buf = new Uint8Array(bytes);
  crypto.getRandomValues(buf);
  return Array.from(buf, (b) => b.toString(16).padStart(2, '0')).join('');
}

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

    const origin = req.headers.get('Origin');
    if (!isAllowedOrigin(origin)) {
      return new Response(JSON.stringify({ error: 'Origin not allowed', origin }), {
        status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
    const ANON = Deno.env.get('SUPABASE_ANON_KEY')!;
    const SERVICE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const META_APP_ID = Deno.env.get('META_APP_ID')!;

    const userClient = createClient(SUPABASE_URL, ANON, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData, error: userErr } = await userClient.auth.getUser();
    if (userErr || !userData?.user) {
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
      return new Response(JSON.stringify({ error: 'No organization' }), {
        status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const body = await req.json().catch(() => ({}));
    const mode = body?.mode === 'reconnect' ? 'reconnect' : 'create';
    const existingIntegrationId =
      typeof body?.existing_integration_id === 'string' ? body.existing_integration_id : null;

    const nonce = nonceHex(32);
    const expires = new Date(Date.now() + 10 * 60 * 1000).toISOString();

    const { data: state, error: insertErr } = await admin
      .from('recruitment_meta_oauth_states')
      .insert({
        organization_id: profile.organization_id,
        user_id: userData.user.id,
        nonce,
        origin,
        expires_at: expires,
        mode,
        existing_integration_id: existingIntegrationId,
      })
      .select('id')
      .single();
    if (insertErr || !state) {
      console.error('[meta-oauth-init] insert failed', insertErr);
      return new Response(JSON.stringify({ error: 'Failed to start OAuth' }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const redirectUri = `${SUPABASE_URL}/functions/v1/meta-oauth-callback`;
    const url = new URL(FB_OAUTH);
    url.searchParams.set('client_id', META_APP_ID);
    url.searchParams.set('redirect_uri', redirectUri);
    url.searchParams.set('state', `${state.id}:${nonce}`);
    url.searchParams.set('scope', SCOPES);
    url.searchParams.set('response_type', 'code');

    return new Response(JSON.stringify({ auth_url: url.toString(), state_id: state.id }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (e: any) {
    console.error('[meta-oauth-init] error', e);
    return new Response(JSON.stringify({ error: e?.message ?? 'Internal error' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
