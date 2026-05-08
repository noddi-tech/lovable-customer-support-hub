// Public webhook: receives inbound SMS from any provider.
// Path-routed: /functions/v1/sms-inbound/<provider>
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';
import { getSmsProvider } from '../_shared/smsProviders/registry.ts';
import { toE164 } from '../_shared/phoneUtils.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-service-signature, x-messente-signature',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  const url = new URL(req.url);
  // Path: /sms-inbound/messente OR /functions/v1/sms-inbound/messente
  const segments = url.pathname.split('/').filter(Boolean);
  const providerName = segments[segments.length - 1];
  if (!providerName || providerName === 'sms-inbound') {
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
    await provider.validateInboundSignature(req, rawBody);
  } catch (e) {
    console.warn(`[sms-inbound/${providerName}] signature validation failed:`, (e as Error).message);
    return json({ error: 'Invalid signature' }, 401);
  }

  let parsed;
  try {
    let parsedBody: unknown;
    if (req.headers.get('content-type')?.includes('application/json')) {
      parsedBody = rawBody ? JSON.parse(rawBody) : {};
    } else {
      // form-encoded fallback
      const params = new URLSearchParams(rawBody);
      parsedBody = Object.fromEntries(params.entries());
    }
    parsed = provider.parseInbound(parsedBody);
  } catch (e) {
    console.error(`[sms-inbound/${providerName}] parse error:`, e);
    return json({ error: 'Failed to parse inbound payload' }, 400);
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  );

  const toPhone = toE164(parsed.toPhone, 'NO');
  const fromPhone = toE164(parsed.fromPhone, 'NO');

  // Find inbox by SMS sender (the "to" of the inbound message is OUR sender number).
  const { data: inbox } = await supabase
    .from('inboxes')
    .select('id, organization_id, sms_provider, sms_provider_phone_number, sms_enabled')
    .eq('sms_provider', providerName)
    .eq('sms_enabled', true)
    .or(`sms_provider_phone_number.eq.${toPhone},sms_provider_phone_number.eq.${parsed.toPhone}`)
    .maybeSingle();

  if (!inbox) {
    console.warn(`[sms-inbound/${providerName}] no inbox found for to=${toPhone}`);
    return json({ ok: true, ignored: true, reason: 'No matching inbox' }, 200);
  }

  // Match applicant by phone within org
  const { data: applicant } = await supabase
    .from('applicants')
    .select('id, first_name, last_name')
    .eq('organization_id', inbox.organization_id)
    .eq('phone', fromPhone)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  // Find existing open SMS conversation for this applicant + inbox
  let conversationId: string | null = null;
  if (applicant) {
    const { data: existing } = await supabase
      .from('conversations')
      .select('id, status')
      .eq('organization_id', inbox.organization_id)
      .eq('inbox_id', inbox.id)
      .eq('channel', 'sms')
      .eq('applicant_id', applicant.id)
      .order('updated_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (existing) {
      conversationId = existing.id;
      // Re-open if closed
      await supabase
        .from('conversations')
        .update({ status: 'open', updated_at: new Date().toISOString(), last_message_sender_type: 'customer' })
        .eq('id', conversationId);
    }
  }

  if (!conversationId) {
    const { data: convIns, error: convErr } = await supabase
      .from('conversations')
      .insert({
        organization_id: inbox.organization_id,
        inbox_id: inbox.id,
        channel: 'sms',
        subject: null,
        conversation_type: 'recruitment',
        applicant_id: applicant?.id || null,
        status: 'open',
        received_at: parsed.receivedAt,
        external_id: `${providerName}_${parsed.providerMessageId}`,
        last_message_sender_type: 'customer',
      })
      .select('id')
      .single();
    if (convErr) {
      console.error('[sms-inbound] failed to create conversation', convErr);
      return json({ error: convErr.message }, 500);
    }
    conversationId = convIns.id;
  }

  const { error: msgErr } = await supabase.from('messages').insert({
    conversation_id: conversationId,
    sender_type: 'customer',
    content: parsed.body,
    content_type: 'text/plain',
    sms_provider: providerName,
    sms_provider_message_id: parsed.providerMessageId,
    sms_status: 'delivered',
    sms_segments: parsed.segments,
    created_at: parsed.receivedAt,
  });

  if (msgErr) {
    console.error('[sms-inbound] failed to insert message', msgErr);
    return json({ error: msgErr.message }, 500);
  }

  return json({ ok: true, conversation_id: conversationId, applicant_matched: !!applicant }, 200);
});

function json(body: unknown, status: number) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}
