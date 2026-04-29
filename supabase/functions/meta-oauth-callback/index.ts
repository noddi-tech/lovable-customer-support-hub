// meta-oauth-callback
// Public endpoint Facebook redirects to. Validates state/nonce, exchanges
// auth code for a long-lived user token, stashes it on the oauth_states row,
// then 302s back to the wizard at the origin captured during init.
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';
import { FALLBACK_ORIGIN, isAllowedOrigin, buildWizardUrl } from '../_shared/meta-origin.ts';

const GRAPH = 'https://graph.facebook.com/v25.0';

function redirect(url: string): Response {
  return new Response(null, { status: 302, headers: { Location: url } });
}

Deno.serve(async (req) => {
  const url = new URL(req.url);
  const code = url.searchParams.get('code');
  const state = url.searchParams.get('state');
  const errorParam = url.searchParams.get('error');
  const errorReason = url.searchParams.get('error_reason');

  const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
  const SERVICE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const META_APP_ID = Deno.env.get('META_APP_ID')!;
  const META_APP_SECRET = Deno.env.get('META_APP_SECRET')!;
  const admin = createClient(SUPABASE_URL, SERVICE);

  if (!state || !state.includes(':')) {
    return redirect(buildWizardUrl(FALLBACK_ORIGIN, { meta_oauth_error: 'invalid_state' }));
  }
  const [stateId, nonce] = state.split(':');

  const { data: stateRow } = await admin
    .from('recruitment_meta_oauth_states')
    .select('id, nonce, origin, expires_at, consumed_at, organization_id, mode, existing_integration_id')
    .eq('id', stateId)
    .maybeSingle();

  const safeOrigin = stateRow && isAllowedOrigin(stateRow.origin)
    ? stateRow.origin as string
    : FALLBACK_ORIGIN;

  if (!stateRow || stateRow.nonce !== nonce) {
    return redirect(buildWizardUrl(safeOrigin, { meta_oauth_error: 'invalid_state' }));
  }
  if (stateRow.consumed_at) {
    return redirect(buildWizardUrl(safeOrigin, { meta_oauth_error: 'invalid_state' }));
  }
  if (new Date(stateRow.expires_at as string) < new Date()) {
    return redirect(buildWizardUrl(safeOrigin, { meta_oauth_error: 'expired' }));
  }

  // User denied or other FB error.
  if (errorParam) {
    await admin
      .from('recruitment_meta_oauth_states')
      .update({ consumed_at: new Date().toISOString() })
      .eq('id', stateId);
    const code = errorReason === 'user_denied' || errorParam === 'access_denied'
      ? 'user_denied'
      : 'fb_error';
    return redirect(buildWizardUrl(safeOrigin, {
      meta_oauth_error: code,
      ...(code === 'fb_error' ? { detail: errorParam } : {}),
    }));
  }

  if (!code) {
    return redirect(buildWizardUrl(safeOrigin, { meta_oauth_error: 'missing_code' }));
  }

  try {
    const redirectUri = `${SUPABASE_URL}/functions/v1/meta-oauth-callback`;

    // Short-lived
    const shortRes = await fetch(
      `${GRAPH}/oauth/access_token?` +
      new URLSearchParams({
        client_id: META_APP_ID,
        client_secret: META_APP_SECRET,
        redirect_uri: redirectUri,
        code,
      }).toString()
    );
    const shortData = await shortRes.json().catch(() => ({}));
    if (!shortRes.ok || !shortData?.access_token) {
      console.error('[meta-oauth-callback] short token exchange failed', shortData);
      return redirect(buildWizardUrl(safeOrigin, { meta_oauth_error: 'exchange_failed' }));
    }

    // Long-lived
    const longRes = await fetch(
      `${GRAPH}/oauth/access_token?` +
      new URLSearchParams({
        grant_type: 'fb_exchange_token',
        client_id: META_APP_ID,
        client_secret: META_APP_SECRET,
        fb_exchange_token: shortData.access_token,
      }).toString()
    );
    const longData = await longRes.json().catch(() => ({}));
    if (!longRes.ok || !longData?.access_token) {
      console.error('[meta-oauth-callback] long token exchange failed', longData);
      return redirect(buildWizardUrl(safeOrigin, { meta_oauth_error: 'exchange_failed' }));
    }

    const longToken = longData.access_token as string;
    const expiresInSec = Number(longData.expires_in ?? 60 * 24 * 60 * 60); // default 60 days
    const tokenExpiresAt = new Date(Date.now() + expiresInSec * 1000).toISOString();

    // /me
    const meRes = await fetch(
      `${GRAPH}/me?fields=id,name&access_token=${encodeURIComponent(longToken)}`
    );
    const meData = await meRes.json().catch(() => ({}));
    if (!meRes.ok || !meData?.id) {
      console.error('[meta-oauth-callback] /me failed', meData);
      return redirect(buildWizardUrl(safeOrigin, { meta_oauth_error: 'exchange_failed' }));
    }

    await admin
      .from('recruitment_meta_oauth_states')
      .update({
        long_lived_user_token: longToken,
        token_expires_at: tokenExpiresAt,
        oauth_user_id: String(meData.id),
        oauth_user_name: meData.name ?? null,
        consumed_at: new Date().toISOString(),
      })
      .eq('id', stateId);

    return redirect(buildWizardUrl(safeOrigin, { meta_oauth_state: stateId }));
  } catch (e: any) {
    console.error('[meta-oauth-callback] error', e);
    return redirect(buildWizardUrl(safeOrigin, { meta_oauth_error: 'exchange_failed' }));
  }
});
