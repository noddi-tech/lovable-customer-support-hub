// meta-deauthorize
// Public endpoint — Meta calls this when a user removes our app from their FB account.
// Verifies signed_request HMAC, marks all integrations created by that FB user as
// disconnected, and clears stored tokens.
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';
import { parseMetaSignedRequest } from '../_shared/meta-signed-request.ts';

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
      return new Response('missing signed_request', { status: 400 });
    }

    const parsed = await parseMetaSignedRequest(signedRequest, META_APP_SECRET);
    if (!parsed) {
      return new Response('invalid signature', { status: 401 });
    }

    const admin = createClient(SUPABASE_URL, SERVICE);
    await admin
      .from('recruitment_meta_integrations')
      .update({
        status: 'disconnected',
        status_message: 'Bruker fjernet appen fra Facebook',
        deauthorized_at: new Date().toISOString(),
        page_access_token: null,
        user_access_token: null,
      })
      .eq('oauth_user_id', parsed.user_id);

    return new Response('', { status: 200 });
  } catch (e: any) {
    console.error('[meta-deauthorize] error', e);
    return new Response('error', { status: 500 });
  }
});
