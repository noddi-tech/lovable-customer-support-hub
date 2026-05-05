import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';
import {
  sendOutboundEmail,
  substituteVars,
  buildAttachmentsBlock,
} from '../_shared/sendOutboundEmail.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface AttachmentInput {
  storage_path: string;
  filename: string;
  applicant_file_id?: string;
}

interface RequestBody {
  conversation_id?: string;
  applicant_id?: string;
  inbox_id: string;
  template_id?: string;
  subject?: string;
  body_html?: string;
  body_text?: string;
  attachments?: AttachmentInput[];
  scheduled_for?: string | null;
  to_email?: string; // override
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  const authHeader = req.headers.get('Authorization');
  if (!authHeader) {
    return json({ error: 'Missing authorization' }, 401);
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!;

  // User-scoped client to identify the caller via their JWT.
  const userClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authHeader } },
  });
  const { data: userRes, error: userErr } = await userClient.auth.getUser();
  if (userErr || !userRes?.user) return json({ error: 'Unauthorized' }, 401);
  const authUserId = userRes.user.id;

  // Service-role client for actual writes.
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
    // 1. Resolve caller profile
    const { data: callerProfile, error: profileErr } = await supabase
      .from('profiles')
      .select('id, full_name, email, email_display_name')
      .eq('user_id', authUserId)
      .maybeSingle();
    if (profileErr || !callerProfile) return json({ error: 'Profile not found' }, 403);

    // 2. Resolve inbox + verify recruitment + same org
    const { data: inbox, error: inboxErr } = await supabase
      .from('inboxes')
      .select('id, name, organization_id, purpose')
      .eq('id', body.inbox_id)
      .maybeSingle();
    if (inboxErr || !inbox) return json({ error: 'Inbox not found' }, 404);
    if (inbox.purpose !== 'recruitment') {
      return json({ error: 'Inbox is not a recruitment inbox' }, 400);
    }

    // Verify caller is org member
    const { data: orgMember } = await supabase
      .from('organization_members')
      .select('role')
      .eq('user_id', authUserId)
      .eq('organization_id', inbox.organization_id)
      .maybeSingle();
    if (!orgMember) return json({ error: 'Not a member of this organization' }, 403);

    // 3. Resolve sender email from inbound_routes (mirrors send-reply-email priority)
    const { data: inboundRoute } = await supabase
      .from('inbound_routes')
      .select('group_email, sender_display_name, address')
      .eq('inbox_id', inbox.id)
      .eq('is_active', true)
      .order('created_at', { ascending: false })
      .maybeSingle();
    const fromEmail = inboundRoute?.group_email || inboundRoute?.address;
    if (!fromEmail) return json({ error: 'Inbox has no active inbound route / sender address' }, 400);

    // 4. Resolve applicant
    let applicantId = body.applicant_id || null;
    let applicant: any = null;
    if (applicantId) {
      const { data: a } = await supabase
        .from('applicants')
        .select('id, organization_id, first_name, last_name, email, phone')
        .eq('id', applicantId)
        .maybeSingle();
      if (!a || a.organization_id !== inbox.organization_id) {
        return json({ error: 'Applicant not found in this organization' }, 404);
      }
      applicant = a;
    }

    // 5. Resolve / create conversation
    let conversationId = body.conversation_id || null;
    if (conversationId) {
      const { data: c } = await supabase
        .from('conversations')
        .select('id, organization_id, applicant_id')
        .eq('id', conversationId)
        .maybeSingle();
      if (!c || c.organization_id !== inbox.organization_id) {
        return json({ error: 'Conversation not found in this organization' }, 404);
      }
      if (!applicantId && c.applicant_id) {
        applicantId = c.applicant_id;
      }
    }

    // 6. Apply template
    let subject = body.subject || '';
    let bodyHtml = body.body_html || '';
    if (body.template_id) {
      const { data: tmpl } = await supabase
        .from('email_templates')
        .select('id, subject, body, organization_id')
        .eq('id', body.template_id)
        .maybeSingle();
      if (!tmpl || tmpl.organization_id !== inbox.organization_id) {
        return json({ error: 'Template not found' }, 404);
      }
      subject = subject || tmpl.subject || '';
      bodyHtml = bodyHtml || tmpl.body || '';
    }

    // 7. Variable substitution
    const vars: Record<string, string> = {
      applicant_first_name: applicant?.first_name || '',
      applicant_last_name: applicant?.last_name || '',
      applicant_name: applicant ? `${applicant.first_name || ''} ${applicant.last_name || ''}`.trim() : '',
      recruiter_name: callerProfile.email_display_name || callerProfile.full_name || '',
      first_name: applicant?.first_name || '',
      last_name: applicant?.last_name || '',
    };
    subject = substituteVars(subject, vars);
    bodyHtml = substituteVars(bodyHtml, vars);

    // 8. Build attachments (signed URLs)
    const { data: org } = await supabase
      .from('organizations')
      .select('default_attachment_expiry_days')
      .eq('id', inbox.organization_id)
      .maybeSingle();
    const expiryDays = org?.default_attachment_expiry_days ?? 7;
    const expirySeconds = expiryDays * 24 * 60 * 60;
    const expiresAtIso = new Date(Date.now() + expirySeconds * 1000).toISOString();

    const signedAttachments: { filename: string; signed_url: string; expires_at: string }[] = [];
    for (const a of body.attachments || []) {
      const { data: signed, error: signErr } = await supabase.storage
        .from('applicant-files')
        .createSignedUrl(a.storage_path, expirySeconds);
      if (signErr || !signed?.signedUrl) {
        console.warn('Failed to sign attachment', a.storage_path, signErr);
        continue;
      }
      signedAttachments.push({
        filename: a.filename,
        signed_url: signed.signedUrl,
        expires_at: expiresAtIso,
      });
    }

    const finalBodyHtml = bodyHtml + buildAttachmentsBlock(signedAttachments);

    // 9. Resolve recipient
    const toEmail = body.to_email || applicant?.email;
    if (!toEmail) return json({ error: 'No recipient email' }, 400);
    const toName = applicant ? `${applicant.first_name || ''} ${applicant.last_name || ''}`.trim() : null;

    const fromName = callerProfile.email_display_name
      || callerProfile.full_name
      || inboundRoute?.sender_display_name
      || inbox.name
      || 'Recruitment';

    // 10. Schedule path
    if (body.scheduled_for && new Date(body.scheduled_for).getTime() > Date.now() + 30_000) {
      const { data: sched, error: schedErr } = await supabase
        .from('recruitment_scheduled_emails')
        .insert({
          organization_id: inbox.organization_id,
          conversation_id: conversationId,
          applicant_id: applicantId,
          inbox_id: inbox.id,
          to_email: toEmail,
          to_name: toName,
          subject,
          body_html: finalBodyHtml,
          attachments: signedAttachments,
          scheduled_for: body.scheduled_for,
          created_by: callerProfile.id,
          status: 'pending',
        })
        .select('id, scheduled_for')
        .single();
      if (schedErr) {
        console.error('Failed to insert scheduled email', schedErr);
        return json({ error: schedErr.message }, 500);
      }
      return json({ scheduled: true, id: sched.id, scheduled_for: sched.scheduled_for }, 200);
    }

    // 11. Create conversation if missing
    if (!conversationId) {
      const { data: convIns, error: convErr } = await supabase
        .from('conversations')
        .insert({
          organization_id: inbox.organization_id,
          inbox_id: inbox.id,
          channel: 'email',
          subject: subject || null,
          conversation_type: 'recruitment',
          applicant_id: applicantId,
          status: 'open',
          received_at: new Date().toISOString(),
          external_id: `rec_${crypto.randomUUID()}`,
        })
        .select('id')
        .single();
      if (convErr) {
        console.error('Failed to create conversation', convErr);
        return json({ error: convErr.message }, 500);
      }
      conversationId = convIns.id;
    }

    // 12. Send via SendGrid
    const sendResult = await sendOutboundEmail({
      toEmail,
      toName,
      fromEmail,
      fromName,
      subject: subject || '(uten emne)',
      html: finalBodyHtml,
    });

    if (!sendResult.ok) {
      console.error('SendGrid error', sendResult.status, sendResult.errorText);
      return json({ error: 'SendGrid send failed', details: sendResult.errorText }, 502);
    }

    // 13. Insert outbound message row
    const { data: msgIns, error: msgErr } = await supabase
      .from('messages')
      .insert({
        conversation_id: conversationId,
        sender_type: 'agent',
        sender_id: authUserId,
        content: finalBodyHtml,
        content_type: 'text/html',
        email_message_id: sendResult.messageIdHeader,
        email_status: 'sent',
      })
      .select('id')
      .single();
    if (msgErr) {
      console.error('Failed to insert message row', msgErr);
      // Email already sent — surface but don't fail loudly
    }

    // 14. Bump conversation updated_at + last sender
    await supabase
      .from('conversations')
      .update({
        updated_at: new Date().toISOString(),
        last_message_sender_type: 'agent',
        status: 'open',
      })
      .eq('id', conversationId);

    return json({ sent: true, message_id: msgIns?.id, conversation_id: conversationId }, 200);
  } catch (err: any) {
    console.error('send-recruitment-email error', err);
    return json({ error: err?.message || 'Internal error' }, 500);
  }
});

function json(body: unknown, status: number) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}
