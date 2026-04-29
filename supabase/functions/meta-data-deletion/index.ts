// meta-data-deletion
// Public endpoint — Meta calls this when a user requests deletion of their data.
// Verifies signed_request HMAC, creates a tracking row with a public confirmation
// code, deletes any stored tokens / oauth user info for that FB user, and returns
// the status URL Meta requires.
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';
import { parseMetaSignedRequest } from '../_shared/meta-signed-request.ts';

const STATUS_BASE = 'https://support.noddi.co/data-deletion-status';

function newConfirmationCode(): string {
  const buf = new Uint8Array(18);
  crypto.getRandomValues(buf);
  return btoa(String.fromCharCode(...buf))
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

Deno.serve(async (req) => {
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  try {
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
    const SERVICE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const META_APP_SECRET = Deno.env.get('META_APP_SECRET')!;

    let signedRequest: string | null = null;
    const ct = req.headers.get('content-type') ?? '';
    if (ct.includes('application/x-www-form-urlencoded')) {
      const form = await req.formData();
      signedRequest = (form.get('signed_request') as string) ?? null;
    } else if (ct.includes('application/json')) {
      const body = await req.json().catch(() => ({}));
      signedRequest = body?.signed_request ?? null;
    } else {
      const text = await req.text();
      const params = new URLSearchParams(text);
      signedRequest = params.get('signed_request');
    }

    if (!signedRequest) {
      return new Response(JSON.stringify({ error: 'missing signed_request' }), {
        status: 400, headers: { 'Content-Type': 'application/json' },
      });
    }

    const parsed = await parseMetaSignedRequest(signedRequest, META_APP_SECRET);
    if (!parsed) {
      return new Response(JSON.stringify({ error: 'invalid signature' }), {
        status: 401, headers: { 'Content-Type': 'application/json' },
      });
    }

    const admin = createClient(SUPABASE_URL, SERVICE);

    const code = newConfirmationCode();
    const { data: request, error: insErr } = await admin
      .from('recruitment_meta_data_deletion_requests')
      .insert({
        confirmation_code: code,
        oauth_user_id: parsed.user_id,
        status: 'pending',
      })
      .select('id, confirmation_code')
      .single();
    if (insErr || !request) {
      console.error('[meta-data-deletion] insert failed', insErr);
      return new Response(JSON.stringify({ error: 'failed' }), {
        status: 500, headers: { 'Content-Type': 'application/json' },
      });
    }

    const { data: matched, error: delErr } = await admin
      .from('recruitment_meta_integrations')
      .update({
        page_access_token: null,
        user_access_token: null,
        oauth_user_id: null,
        oauth_user_name: null,
        status: 'disconnected',
        status_message: 'Bruker har bedt om datasletting',
        deauthorized_at: new Date().toISOString(),
      })
      .eq('oauth_user_id', parsed.user_id)
      .select('id');

    await admin
      .from('recruitment_meta_data_deletion_requests')
      .update({
        status: delErr ? 'failed' : 'completed',
        completed_at: new Date().toISOString(),
        details: { matched_integrations: matched?.length ?? 0, error: delErr?.message ?? null },
      })
      .eq('id', request.id);

    return new Response(JSON.stringify({
      url: `${STATUS_BASE}/${code}`,
      confirmation_code: code,
    }), { headers: { 'Content-Type': 'application/json' } });
  } catch (e: any) {
    console.error('[meta-data-deletion] error', e);
    return new Response(JSON.stringify({ error: e?.message ?? 'Internal error' }), {
      status: 500, headers: { 'Content-Type': 'application/json' },
    });
  }
});
