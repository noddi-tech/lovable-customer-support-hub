// Phase B4: Manual long-lived Meta token exchange.
// Takes a short-lived user token + app secret, exchanges for a long-lived user
// token, derives a (non-expiring) page token, validates via debug_token, and
// writes the result to recruitment_meta_integrations.
//
// SECURITY: app_secret and user_token are NEVER logged. They are received,
// used in the outbound Graph API calls, and discarded. They are not persisted.
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

function mapMetaError(msg: string | null | undefined, code?: number): string {
  const m = (msg ?? '').toLowerCase();
  if (m.includes('invalid_grant') || code === 190 || m.includes('session has expired') || m.includes('access token')) {
    return 'Brukertokenet er ugyldig eller utløpt — generér nytt i Graph Explorer og prøv igjen.';
  }
  if (m.includes('app_id') || m.includes('client_id') || m.includes('app_secret') || m.includes('client_secret')) {
    return 'App Secret er ugyldig — sjekk at du har kopiert riktig verdi fra Meta Developer Portal.';
  }
  if (m.includes('does not have permission') || m.includes('not authorized')) {
    return 'Brukeren har ikke tilgang til denne Facebook-siden.';
  }
  return msg ?? 'Ukjent feil fra Meta. Prøv igjen.';
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
    const META_APP_SECRET_SERVER = Deno.env.get('META_APP_SECRET');
    if (!META_APP_ID || !META_APP_SECRET_SERVER) {
      return json({ error: 'Server is missing META_APP_ID or META_APP_SECRET configuration.' }, 500);
    }

    const userClient = createClient(SUPABASE_URL, ANON, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData, error: userErr } = await userClient.auth.getUser();
    if (userErr || !userData?.user) return json({ error: 'Unauthorized' }, 401);

    const body = await req.json().catch(() => ({}));
    const integration_id = typeof body?.integration_id === 'string' ? body.integration_id : '';
    const app_secret = typeof body?.app_secret === 'string' ? body.app_secret.trim() : '';
    const user_token = typeof body?.user_token === 'string' ? body.user_token.trim() : '';

    if (!integration_id) return json({ error: 'integration_id required' }, 400);
    if (app_secret.length < 30) return json({ error: 'App Secret må være minst 30 tegn.' }, 400);
    if (!user_token.startsWith('EAA') || user_token.length < 50) {
      return json({ error: 'Brukertoken ser ugyldig ut (skal starte med EAA).' }, 400);
    }

    const admin = createClient(SUPABASE_URL, SERVICE);
    const { data: integration } = await admin
      .from('recruitment_meta_integrations')
      .select('id, page_id, organization_id')
      .eq('id', integration_id)
      .maybeSingle();
    if (!integration) return json({ error: 'Integration not found' }, 404);

    // Confirm caller is org admin
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

    // Step 1: Exchange short-lived user token for long-lived user token
    const exchangeUrl =
      `${GRAPH}/oauth/access_token?grant_type=fb_exchange_token` +
      `&client_id=${encodeURIComponent(META_APP_ID)}` +
      `&client_secret=${encodeURIComponent(app_secret)}` +
      `&fb_exchange_token=${encodeURIComponent(user_token)}`;
    const exchangeRes = await fetch(exchangeUrl);
    const exchangeData = await exchangeRes.json().catch(() => ({}));
    if (!exchangeRes.ok || !exchangeData?.access_token) {
      return json({
        error: mapMetaError(exchangeData?.error?.message, exchangeData?.error?.code),
      }, 400);
    }
    const longLivedUserToken = exchangeData.access_token as string;

    // Step 2: Derive page token using long-lived user token
    const pageRes = await fetch(
      `${GRAPH}/${encodeURIComponent(integration.page_id)}?fields=name,access_token` +
      `&access_token=${encodeURIComponent(longLivedUserToken)}`,
    );
    const pageData = await pageRes.json().catch(() => ({}));
    if (!pageRes.ok || !pageData?.access_token) {
      return json({
        error: mapMetaError(pageData?.error?.message, pageData?.error?.code),
      }, 400);
    }
    const pageAccessToken = pageData.access_token as string;

    // Step 3: Validate page token via debug_token (using app token)
    const appToken = `${META_APP_ID}|${META_APP_SECRET_SERVER}`;
    const debugRes = await fetch(
      `${GRAPH}/debug_token?input_token=${encodeURIComponent(pageAccessToken)}` +
      `&access_token=${encodeURIComponent(appToken)}`,
    );
    const debugData = await debugRes.json().catch(() => ({}));
    const info = debugData?.data ?? {};
    const isValid = !!info?.is_valid;
    const expiresAt = typeof info?.expires_at === 'number' ? info.expires_at : 0;
    const scopes: string[] = Array.isArray(info?.scopes) ? info.scopes : [];
    const missingScopes = REQUIRED_SCOPES.filter((s) => !scopes.includes(s));

    if (!isValid) {
      return json({ error: 'Det avledede side-tokenet ble ikke akseptert av Meta. Prøv igjen.' }, 400);
    }

    // Convert expires_at -> timestamptz string. 0 means "never expires".
    const neverExpires = expiresAt === 0;
    const expiresAtIso = neverExpires ? 'infinity' : new Date(expiresAt * 1000).toISOString();

    const newStatus = missingScopes.length > 0 ? 'broken' : 'connected';
    const statusMessage = missingScopes.length > 0
      ? `Mangler tilganger: ${missingScopes.join(', ')}`
      : null;

    const { error: updErr } = await admin
      .from('recruitment_meta_integrations')
      .update({
        page_access_token: pageAccessToken,
        user_token_expires_at: expiresAtIso,
        token_expires_at: expiresAtIso,
        status: newStatus,
        status_message: statusMessage,
        last_health_check_at: new Date().toISOString(),
      })
      .eq('id', integration_id);
    if (updErr) {
      return json({ error: 'Kunne ikke lagre nytt token i databasen.' }, 500);
    }

    // Resolve any unresolved alerts for this integration
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
    return json({ error: 'Uventet serverfeil under token-utveksling.' }, 500);
  }
});
