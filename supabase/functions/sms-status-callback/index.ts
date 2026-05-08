// Public webhook: receives delivery status updates from any SMS provider.
// Path-routed: /functions/v1/sms-status-callback/<provider>
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';
import { getSmsProvider } from '../_shared/smsProviders/registry.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-service-signature, x-messente-signature',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  const url = new URL(req.url);
  const segments = url.pathname.split('/').filter(Boolean);
  const providerName = segments[segments.length - 1];
  if (!providerName || providerName === 'sms-status-callback') {
    return json({ error: 'Provider missing in URL path' }, 400);
  }

  const rawBody = await req.text();
  let provider;
  try {
    provider = getSmsProvider(providerName);
  } catch (e) {
    return json({ error: (e as Error).message }, 400);
  }

  try {
    await provider.validateStatusSignature(req, rawBody);
  } catch (e) {
    console.warn(`[sms-status-callback/${providerName}] signature validation failed:`, (e as Error).message);
    return json({ error: 'Invalid signature' }, 401);
  }

  let parsed;
  try {
    let parsedBody: unknown;
    if (req.headers.get('content-type')?.includes('application/json')) {
      parsedBody = rawBody ? JSON.parse(rawBody) : {};
    } else {
      const params = new URLSearchParams(rawBody);
      parsedBody = Object.fromEntries(params.entries());
    }
    parsed = provider.parseStatusUpdate(parsedBody);
  } catch (e) {
    console.error(`[sms-status-callback/${providerName}] parse error:`, e);
    return json({ error: 'Failed to parse status payload' }, 400);
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  );

  const update: Record<string, unknown> = { sms_status: parsed.status };
  if (parsed.segments) update.sms_segments = parsed.segments;

  const { data: updated, error } = await supabase
    .from('messages')
    .update(update)
    .eq('sms_provider', providerName)
    .eq('sms_provider_message_id', parsed.providerMessageId)
    .select('id, conversation_id');

  if (error) {
    console.error('[sms-status-callback] update failed', error);
    return json({ error: error.message }, 500);
  }
  if (!updated || updated.length === 0) {
    console.warn(`[sms-status-callback] no message found for provider=${providerName} id=${parsed.providerMessageId}`);
  }

  return json({ ok: true, updated: updated?.length || 0 }, 200);
});

function json(body: unknown, status: number) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}
