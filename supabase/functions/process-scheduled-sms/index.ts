// Cron-invoked: process due rows in recruitment_scheduled_sms.
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';
import { getSmsProvider } from '../_shared/smsProviders/registry.ts';
import { toE164 } from '../_shared/phoneUtils.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  );

  const { data: due, error } = await supabase
    .from('recruitment_scheduled_sms')
    .select('*')
    .eq('status', 'pending')
    .lte('scheduled_for', new Date().toISOString())
    .order('scheduled_for', { ascending: true })
    .limit(50);

  if (error) return json({ error: error.message }, 500);
  if (!due || due.length === 0) return json({ processed: 0 }, 200);

  let processed = 0;
  let failed = 0;

  for (const row of due) {
    // Claim
    const { data: claimed } = await supabase
      .from('recruitment_scheduled_sms')
      .update({ status: 'processing', attempts: row.attempts + 1 })
      .eq('id', row.id)
      .eq('status', 'pending')
      .select('id')
      .maybeSingle();
    if (!claimed) continue;

    try {
      const { data: inbox } = await supabase
        .from('inboxes')
        .select('id, organization_id, sms_provider, sms_provider_phone_number, sms_enabled')
        .eq('id', row.inbox_id)
        .maybeSingle();
      if (!inbox || !inbox.sms_enabled || !inbox.sms_provider || !inbox.sms_provider_phone_number) {
        throw new Error('Inbox SMS no longer configured');
      }

      const provider = getSmsProvider(inbox.sms_provider);
      const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
      const sendResult = await provider.send({
        toPhone: toE164(row.to_phone, 'NO'),
        fromSender: inbox.sms_provider_phone_number,
        body: row.body,
        dlrUrl: provider.buildDlrUrl(supabaseUrl),
      });

      if (!sendResult.ok) throw new Error(sendResult.errorMessage || 'Provider send failed');

      // Insert message row
      let conversationId = row.conversation_id;
      if (!conversationId) {
        const { data: convIns } = await supabase
          .from('conversations')
          .insert({
            organization_id: row.organization_id,
            inbox_id: row.inbox_id,
            channel: 'sms',
            conversation_type: 'recruitment',
            applicant_id: row.applicant_id,
            status: 'open',
            received_at: new Date().toISOString(),
            external_id: `rec_sms_${crypto.randomUUID()}`,
          })
          .select('id')
          .single();
        conversationId = convIns?.id || null;
      }

      const { data: msgIns } = await supabase
        .from('messages')
        .insert({
          conversation_id: conversationId,
          sender_type: 'agent',
          sender_id: null,
          content: row.body,
          content_type: 'text/plain',
          sms_provider: inbox.sms_provider,
          sms_provider_message_id: sendResult.providerMessageId || null,
          sms_status: 'sent',
        })
        .select('id')
        .single();

      await supabase
        .from('recruitment_scheduled_sms')
        .update({
          status: 'sent',
          sent_at: new Date().toISOString(),
          message_id: msgIns?.id || null,
          sms_provider: inbox.sms_provider,
          sms_provider_message_id: sendResult.providerMessageId || null,
          conversation_id: conversationId,
        })
        .eq('id', row.id);

      processed++;
    } catch (e) {
      failed++;
      await supabase
        .from('recruitment_scheduled_sms')
        .update({
          status: row.attempts >= 3 ? 'failed' : 'pending',
          error_message: (e as Error).message,
          next_attempt_at: new Date(Date.now() + 5 * 60_000).toISOString(),
        })
        .eq('id', row.id);
    }
  }

  return json({ processed, failed, total: due.length }, 200);
});

function json(body: unknown, status: number) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}
