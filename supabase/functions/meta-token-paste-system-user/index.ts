// Phase B4: Save a Meta System User token directly (no exchange).
// System User tokens never expire and are managed in Business Manager.
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
];

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) return json({ error: 'Unauthorized' }, 401);

    const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
    const ANON = Deno.env.get('SUPABASE_ANON_KEY')!;
    const SERVICE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const META_APP_ID = Deno.env.get('META_APP_ID');
    const META_APP_SECRET = Deno.env.get('META_APP_SECRET');
    if (!META_APP_ID || !META_APP_SECRET) {
      return json({ error: 'Server is missing META_APP_ID or META_APP_SECRET configuration.' }, 500);
    }

    const userClient = createClient(SUPABASE_URL, ANON, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData, error: userErr } = await userClient.auth.getUser();
    if (userErr || !userData?.user) return json({ error: 'Unauthorized' }, 401);

    const body = await req.json().catch(() => ({}));
    const integration_id = typeof body?.integration_id === 'string' ? body.integration_id : '';
    const system_user_token = typeof body?.system_user_token === 'string' ? body.system_user_token.trim() : '';
    if (!integration_id) return json({ error: 'integration_id required' }, 400);
    if (!system_user_token.startsWith('EAA') || system_user_token.length < 50) {
      return json({ error: 'System User-tokenet ser ugyldig ut (skal starte med EAA).' }, 400);
    }

    const admin = createClient(SUPABASE_URL, SERVICE);
    const { data: integration } = await admin
      .from('recruitment_meta_integrations')
      .select('id, page_id, organization_id')
      .eq('id', integration_id)
      .maybeSingle();
    if (!integration) return json({ error: 'Integration not found' }, 404);

    const { data: membership } = await admin
      .from('organization_memberships')
      .select('role, status')
      .eq('user_id', userData.user.id)
      .eq('organization_id', integration.organization_id)
      .eq('status', 'active')
      .maybeSingle();
    if (!membership || !['admin', 'super_admin'].includes(membership.role)) {
      return json({ error: 'Forbidden' }, 403);
    }

    // Validate via debug_token
    const appToken = `${META_APP_ID}|${META_APP_SECRET}`;
    const debugRes = await fetch(
      `${GRAPH}/debug_token?input_token=${encodeURIComponent(system_user_token)}` +
      `&access_token=${encodeURIComponent(appToken)}`,
    );
    const debugData = await debugRes.json().catch(() => ({}));
    const info = debugData?.data ?? {};
    if (!info?.is_valid) {
      return json({ error: 'System User-tokenet ble ikke akseptert av Meta.' }, 400);
    }

    const scopes: string[] = Array.isArray(info?.scopes) ? info.scopes : [];
    const missingScopes = REQUIRED_SCOPES.filter((s) => !scopes.includes(s));
    const expiresAt = typeof info?.expires_at === 'number' ? info.expires_at : 0;
    const neverExpires = expiresAt === 0;
    const expiresAtIso = neverExpires ? 'infinity' : new Date(expiresAt * 1000).toISOString();

    const newStatus = missingScopes.length > 0 ? 'broken' : 'connected';
    const statusMessage = missingScopes.length > 0
      ? `Mangler tilganger: ${missingScopes.join(', ')}`
      : null;

    const { error: updErr } = await admin
      .from('recruitment_meta_integrations')
      .update({
        page_access_token: system_user_token,
        user_token_expires_at: expiresAtIso,
        token_expires_at: expiresAtIso,
        status: newStatus,
        status_message: statusMessage,
        last_health_check_at: new Date().toISOString(),
      })
      .eq('id', integration_id);
    if (updErr) return json({ error: 'Kunne ikke lagre token i databasen.' }, 500);

    await admin
      .from('recruitment_admin_alerts')
      .update({ resolved_at: new Date().toISOString() })
      .eq('integration_id', integration_id)
      .is('resolved_at', null);

    return json({
      success: true,
      expires_at: neverExpires ? null : new Date(expiresAt * 1000).toISOString(),
      never_expires: neverExpires,
      scopes,
      missing_scopes: missingScopes,
    });
  } catch (e) {
    return json({ error: 'Uventet serverfeil.' }, 500);
  }
});
