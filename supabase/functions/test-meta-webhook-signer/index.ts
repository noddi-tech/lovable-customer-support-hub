// Temporary helper: signs a Meta webhook payload with META_APP_SECRET and POSTs to meta-lead-webhook
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  const APP_SECRET = Deno.env.get('META_APP_SECRET');
  if (!APP_SECRET) {
    return new Response(JSON.stringify({ error: 'META_APP_SECRET missing' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }

  const body = await req.json();
  const payload = JSON.stringify(body.payload);

  // Compute HMAC SHA-256
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(APP_SECRET),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const sigBuf = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(payload));
  const sigHex = Array.from(new Uint8Array(sigBuf)).map((b) => b.toString(16).padStart(2, '0')).join('');
  const signature = `sha256=${sigHex}`;

  const target = body.target ?? 'https://qgfaycwsangsqzpveoup.supabase.co/functions/v1/meta-lead-webhook';
  const resp = await fetch(target, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-hub-signature-256': signature,
    },
    body: payload,
  });
  const text = await resp.text();

  return new Response(JSON.stringify({
    signature,
    webhook_status: resp.status,
    webhook_response: text,
  }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
});
