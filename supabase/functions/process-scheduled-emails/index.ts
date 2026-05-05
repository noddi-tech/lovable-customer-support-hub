import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';
import { sendOutboundEmail } from '../_shared/sendOutboundEmail.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const MAX_ATTEMPTS = 3;
const BACKOFF_MINUTES = [1, 5, 30];

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  );

  try {
    // Claim due jobs (FOR UPDATE SKIP LOCKED via RPC-less pattern: select + atomic update by id with status guard)
    const nowIso = new Date().toISOString();
    const { data: due, error: dueErr } = await supabase
      .from('recruitment_scheduled_emails')
      .select('*')
      .eq('status', 'pending')
      .lte('scheduled_for', nowIso)
      .order('scheduled_for', { ascending: true })
      .limit(50);

    if (dueErr) {
      console.error('process-scheduled-emails: query failed', dueErr);
      return json({ error: dueErr.message }, 500);
    }

    let processed = 0;
    let succeeded = 0;
    let failed = 0;

    for (const row of due || []) {
      // Atomic claim: only proceed if we can flip status pending->processing
      const { data: claimed, error: claimErr } = await supabase
        .from('recruitment_scheduled_emails')
        .update({ status: 'processing' })
        .eq('id', row.id)
        .eq('status', 'pending')
        .select('id')
        .maybeSingle();
      if (claimErr || !claimed) continue;
      processed += 1;

      try {
        // Resolve inbox + sender
        const { data: inbox } = await supabase
          .from('inboxes')
          .select('id, name, organization_id, purpose')
          .eq('id', row.inbox_id)
          .maybeSingle();
        if (!inbox) throw new Error('Inbox not found');

        const { data: inboundRoute } = await supabase
          .from('inbound_routes')
          .select('group_email, sender_display_name, address')
          .eq('inbox_id', inbox.id)
          .eq('is_active', true)
          .order('created_at', { ascending: false })
          .maybeSingle();
        const fromEmail = inboundRoute?.group_email || inboundRoute?.address;
        if (!fromEmail) throw new Error('No active inbound route');

        const { data: creator } = await supabase
          .from('profiles')
          .select('full_name, email_display_name, user_id')
          .eq('id', row.created_by)
          .maybeSingle();
        const fromName = creator?.email_display_name
          || creator?.full_name
          || inboundRoute?.sender_display_name
          || inbox.name
          || 'Recruitment';

        // Send
        const sendResult = await sendOutboundEmail({
          toEmail: row.to_email,
          toName: row.to_name,
          fromEmail,
          fromName,
          subject: row.subject || '(uten emne)',
          html: row.body_html,
          text: row.body_text,
        });
        if (!sendResult.ok) {
          throw new Error(`SendGrid ${sendResult.status}: ${sendResult.errorText}`);
        }

        // Ensure conversation exists
        let conversationId = row.conversation_id;
        if (!conversationId) {
          const { data: convIns, error: convErr } = await supabase
            .from('conversations')
            .insert({
              organization_id: inbox.organization_id,
              inbox_id: inbox.id,
              channel: 'email',
              subject: row.subject || null,
              conversation_type: 'recruitment',
              applicant_id: row.applicant_id,
              status: 'open',
              received_at: new Date().toISOString(),
              external_id: `rec_${crypto.randomUUID()}`,
            })
            .select('id')
            .single();
          if (convErr) throw convErr;
          conversationId = convIns.id;
        }

        const { data: msgIns } = await supabase
          .from('messages')
          .insert({
            conversation_id: conversationId,
            sender_type: 'agent',
            sender_id: creator?.user_id || null,
            content: row.body_html,
            content_type: 'text/html',
            email_message_id: sendResult.messageIdHeader,
            email_status: 'sent',
          })
          .select('id')
          .single();

        await supabase
          .from('conversations')
          .update({
            updated_at: new Date().toISOString(),
            last_message_sender_type: 'agent',
            status: 'open',
          })
          .eq('id', conversationId);

        await supabase
          .from('recruitment_scheduled_emails')
          .update({
            status: 'sent',
            sent_at: new Date().toISOString(),
            message_id: msgIns?.id || null,
            conversation_id: conversationId,
            error_message: null,
          })
          .eq('id', row.id);
        succeeded += 1;
      } catch (sendErr: any) {
        failed += 1;
        const newAttempts = (row.attempts || 0) + 1;
        const finalFail = newAttempts >= MAX_ATTEMPTS;
        const backoffMin = BACKOFF_MINUTES[Math.min(newAttempts - 1, BACKOFF_MINUTES.length - 1)];
        const nextAttempt = new Date(Date.now() + backoffMin * 60_000).toISOString();
        await supabase
          .from('recruitment_scheduled_emails')
          .update({
            status: finalFail ? 'failed' : 'pending',
            attempts: newAttempts,
            next_attempt_at: finalFail ? null : nextAttempt,
            scheduled_for: finalFail ? row.scheduled_for : nextAttempt,
            error_message: String(sendErr?.message || sendErr).slice(0, 1000),
          })
          .eq('id', row.id);
        console.error(`Send failed for ${row.id} (attempt ${newAttempts})`, sendErr);
      }
    }

    return json({ processed, succeeded, failed }, 200);
  } catch (err: any) {
    console.error('process-scheduled-emails fatal', err);
    return json({ error: err?.message || 'Internal error' }, 500);
  }
});

function json(body: unknown, status: number) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}
