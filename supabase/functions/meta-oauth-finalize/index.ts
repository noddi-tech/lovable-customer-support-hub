// meta-oauth-finalize
// Authenticated. Given a state_id and the operator-selected page_id, derives a
// page access token from the long-lived user token, subscribes the page to
// leadgen webhooks, and upserts the integration row.
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const GRAPH = 'https://graph.facebook.com/v25.0';

function newVerifyToken(): string {
  const buf = new Uint8Array(24);
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
      .select('organization_id, id')
      .eq('user_id', userData.user.id)
      .maybeSingle();
    if (!profile?.organization_id) {
      return new Response(JSON.stringify({ error: 'Forbidden' }), {
        status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const body = await req.json().catch(() => ({}));
    const stateId = body?.state_id as string | undefined;
    const pageId = body?.page_id as string | undefined;
    if (!stateId || !pageId) {
      return new Response(JSON.stringify({ error: 'state_id and page_id required' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { data: state } = await admin
      .from('recruitment_meta_oauth_states')
      .select('id, organization_id, long_lived_user_token, token_expires_at, oauth_user_id, oauth_user_name, mode, existing_integration_id')
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

    const userToken = state.long_lived_user_token as string;

    // Derive the page access token
    const pageRes = await fetch(
      `${GRAPH}/${pageId}?fields=name,access_token&access_token=${encodeURIComponent(userToken)}`
    );
    const pageData = await pageRes.json().catch(() => ({}));
    if (!pageRes.ok || !pageData?.access_token) {
      return new Response(JSON.stringify({
        error: pageData?.error?.message ?? `Kunne ikke hente sidetilgang (HTTP ${pageRes.status})`,
      }), {
        status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    const pageToken = pageData.access_token as string;
    const pageName = pageData.name as string;

    // Subscribe webhook
    const subRes = await fetch(
      `${GRAPH}/${pageId}/subscribed_apps?subscribed_fields=leadgen&access_token=${encodeURIComponent(pageToken)}`,
      { method: 'POST' }
    );
    const subData = await subRes.json().catch(() => ({}));
    if (!subRes.ok || subData?.success === false) {
      return new Response(JSON.stringify({
        error: subData?.error?.message ?? `Webhook-abonnement feilet (HTTP ${subRes.status})`,
      }), {
        status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Upsert integration
    const isReconnect = state.mode === 'reconnect' && state.existing_integration_id;
    const { data: existing } = isReconnect
      ? await admin.from('recruitment_meta_integrations').select('id, verify_token').eq('id', state.existing_integration_id).maybeSingle()
      : await admin.from('recruitment_meta_integrations').select('id, verify_token').eq('organization_id', profile.organization_id).eq('page_id', pageId).maybeSingle();

    let integrationId: string;
    if (existing?.id) {
      const { data: updated, error: updErr } = await admin
        .from('recruitment_meta_integrations')
        .update({
          page_id: pageId,
          page_name: pageName,
          page_access_token: pageToken,
          user_access_token: userToken,
          user_token_expires_at: state.token_expires_at,
          connected_via: 'oauth',
          oauth_user_id: state.oauth_user_id,
          oauth_user_name: state.oauth_user_name,
          status: 'connected',
          status_message: null,
          deauthorized_at: null,
        })
        .eq('id', existing.id)
        .select('*')
        .single();
      if (updErr) throw updErr;
      integrationId = updated.id;
    } else {
      const { data: inserted, error: insErr } = await admin
        .from('recruitment_meta_integrations')
        .insert({
          organization_id: profile.organization_id,
          page_id: pageId,
          page_name: pageName,
          page_access_token: pageToken,
          user_access_token: userToken,
          user_token_expires_at: state.token_expires_at,
          connected_via: 'oauth',
          oauth_user_id: state.oauth_user_id,
          oauth_user_name: state.oauth_user_name,
          verify_token: newVerifyToken(),
          status: 'connected',
          created_by: profile.id,
        })
        .select('*')
        .single();
      if (insErr) throw insErr;
      integrationId = inserted.id;
    }

    await admin.from('recruitment_meta_oauth_states').delete().eq('id', stateId);

    const { data: integration } = await admin
      .from('recruitment_meta_integrations')
      .select('*')
      .eq('id', integrationId)
      .single();

    return new Response(JSON.stringify({ integration }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (e: any) {
    console.error('[meta-oauth-finalize] error', e);
    return new Response(JSON.stringify({ error: e?.message ?? 'Internal error' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
