import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';
import { getSmsProvider } from '../_shared/smsProviders/registry.ts';
import { toE164 } from '../_shared/phoneUtils.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface RequestBody {
  conversation_id?: string;
  applicant_id?: string;
  inbox_id: string;
  template_id?: string;
  body?: string;
  scheduled_for?: string | null;
  to_phone?: string; // override
}

function substituteVars(text: string, vars: Record<string, string>): string {
  return text.replace(/\{\{\s*(\w+)\s*\}\}/g, (_, k) => vars[k] ?? '');
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  const authHeader = req.headers.get('Authorization');
  if (!authHeader) return json({ error: 'Missing authorization' }, 401);

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!;

  const userClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authHeader } },
  });
  const { data: userRes, error: userErr } = await userClient.auth.getUser();
  if (userErr || !userRes?.user) return json({ error: 'Unauthorized' }, 401);
  const authUserId = userRes.user.id;

  const supabase = createClient(supabaseUrl, serviceKey);

  let body: RequestBody;
  try {
    body = await req.json();
  } catch {
    return json({ error: 'Invalid JSON body' }, 400);
  }

  if (!body.inbox_id) return json({ error: 'inbox_id required' }, 400);
  if (!body.conversation_id && !body.applicant_id) {
    return json({ error: 'conversation_id or applicant_id required' }, 400);
  }

  try {
    const { data: callerProfile } = await supabase
      .from('profiles')
      .select('id, full_name, email')
      .eq('user_id', authUserId)
      .maybeSingle();
    if (!callerProfile) return json({ error: 'Profile not found' }, 403);

    const { data: inbox } = await supabase
      .from('inboxes')
      .select('id, name, organization_id, purpose, sms_provider, sms_provider_phone_number, sms_enabled')
      .eq('id', body.inbox_id)
      .maybeSingle();
    if (!inbox) return json({ error: 'Inbox not found' }, 404);
    if (inbox.purpose !== 'recruitment') {
      return json({ error: 'Inbox is not a recruitment inbox' }, 400);
    }
    if (!inbox.sms_enabled || !inbox.sms_provider || !inbox.sms_provider_phone_number) {
      return json({ error: 'SMS is not configured for this inbox' }, 400);
    }

    const { data: orgMember } = await supabase
      .from('organization_memberships')
      .select('role, status')
      .eq('user_id', authUserId)
      .eq('organization_id', inbox.organization_id)
      .eq('status', 'active')
      .maybeSingle();
    if (!orgMember) return json({ error: 'Not a member of this organization' }, 403);

    let applicantId = body.applicant_id || null;
    let applicant: any = null;
    if (applicantId) {
      const { data: a } = await supabase
        .from('applicants')
        .select('id, organization_id, first_name, last_name, phone')
        .eq('id', applicantId)
        .maybeSingle();
      if (!a || a.organization_id !== inbox.organization_id) {
        return json({ error: 'Applicant not found in this organization' }, 404);
      }
      applicant = a;
    }

    let conversationId = body.conversation_id || null;
    if (conversationId) {
      const { data: c } = await supabase
        .from('conversations')
        .select('id, organization_id, applicant_id, channel')
        .eq('id', conversationId)
        .maybeSingle();
      if (!c || c.organization_id !== inbox.organization_id) {
        return json({ error: 'Conversation not found in this organization' }, 404);
      }
      if (!applicantId && c.applicant_id) applicantId = c.applicant_id;
    }

    // Template
    let messageBody = body.body || '';
    if (body.template_id) {
      const { data: tmpl } = await supabase
        .from('recruitment_email_templates')
        .select('id, body, organization_id, type')
        .eq('id', body.template_id)
        .maybeSingle();
      if (!tmpl || tmpl.organization_id !== inbox.organization_id) {
        return json({ error: 'Template not found' }, 404);
      }
      if (tmpl.type !== 'sms') {
        return json({ error: 'Template is not an SMS template' }, 400);
      }
      messageBody = messageBody || tmpl.body || '';
    }
    if (!messageBody.trim()) return json({ error: 'Message body required' }, 400);

    const { data: orgRow } = await supabase
      .from('organizations')
      .select('name')
      .eq('id', inbox.organization_id)
      .maybeSingle();

    const recruiterName = callerProfile.full_name || '';
    messageBody = substituteVars(messageBody, {
      applicant_first_name: applicant?.first_name || '',
      applicant_last_name: applicant?.last_name || '',
      first_name: applicant?.first_name || '',
      recruiter_name: recruiterName,
      company_name: orgRow?.name || '',
    });

    // Recipient phone
    const rawTo = body.to_phone || applicant?.phone;
    if (!rawTo) return json({ error: 'No recipient phone' }, 400);
    const toPhone = toE164(rawTo, 'NO');
    const toName = applicant ? `${applicant.first_name || ''} ${applicant.last_name || ''}`.trim() : null;

    // Schedule path
    if (body.scheduled_for && new Date(body.scheduled_for).getTime() > Date.now() + 30_000) {
      const { data: sched, error: schedErr } = await supabase
        .from('recruitment_scheduled_sms')
        .insert({
          organization_id: inbox.organization_id,
          conversation_id: conversationId,
          applicant_id: applicantId,
          inbox_id: inbox.id,
          to_phone: toPhone,
          to_name: toName,
          body: messageBody,
          scheduled_for: body.scheduled_for,
          created_by: callerProfile.id,
          status: 'pending',
          sms_provider: inbox.sms_provider,
        })
        .select('id, scheduled_for')
        .single();
      if (schedErr) return json({ error: schedErr.message }, 500);
      return json({ scheduled: true, id: sched.id, scheduled_for: sched.scheduled_for }, 200);
    }

    // Create conversation if missing
    if (!conversationId) {
      const { data: convIns, error: convErr } = await supabase
        .from('conversations')
        .insert({
          organization_id: inbox.organization_id,
          inbox_id: inbox.id,
          channel: 'sms',
          subject: null,
          conversation_type: 'recruitment',
          applicant_id: applicantId,
          status: 'open',
          received_at: new Date().toISOString(),
          external_id: `rec_sms_${crypto.randomUUID()}`,
        })
        .select('id')
        .single();
      if (convErr) return json({ error: convErr.message }, 500);
      conversationId = convIns.id;
    }

    // Send via provider
    const provider = getSmsProvider(inbox.sms_provider);
    const appBaseUrl = Deno.env.get('PUBLIC_APP_URL') || `${supabaseUrl}`;
    const dlrUrl = provider.buildDlrUrl(supabaseUrl);

    const sendResult = await provider.send({
      toPhone,
      fromSender: inbox.sms_provider_phone_number,
      body: messageBody,
      dlrUrl,
    });

    if (!sendResult.ok) {
      // Persist a failed message row for visibility
      await supabase.from('messages').insert({
        conversation_id: conversationId,
        sender_type: 'agent',
        sender_id: authUserId,
        content: messageBody,
        content_type: 'text/plain',
        sms_provider: inbox.sms_provider,
        sms_status: 'failed',
      });
      return json(
        { error: 'SMS provider send failed', details: sendResult.errorMessage, code: sendResult.errorCode },
        502,
      );
    }

    const { data: msgIns, error: msgErr } = await supabase
      .from('messages')
      .insert({
        conversation_id: conversationId,
        sender_type: 'agent',
        sender_id: authUserId,
        content: messageBody,
        content_type: 'text/plain',
        sms_provider: inbox.sms_provider,
        sms_provider_message_id: sendResult.providerMessageId || null,
        sms_status: 'sent',
        sms_segments: sendResult.segments || null,
      })
      .select('id')
      .single();
    if (msgErr) console.error('Failed to insert SMS message row', msgErr);

    await supabase
      .from('conversations')
      .update({
        updated_at: new Date().toISOString(),
        last_message_sender_type: 'agent',
        status: 'open',
      })
      .eq('id', conversationId);

    return json(
      { sent: true, message_id: msgIns?.id, conversation_id: conversationId, provider_message_id: sendResult.providerMessageId },
      200,
    );
  } catch (err: any) {
    console.error('send-recruitment-sms error', err);
    return json({ error: err?.message || 'Internal error' }, 500);
  }
});

function json(body: unknown, status: number) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}
