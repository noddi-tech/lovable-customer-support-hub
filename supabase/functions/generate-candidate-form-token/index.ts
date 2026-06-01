// Recruiter-initiated: create a candidate form token and optionally dispatch via email/SMS.
// Token creation is delegated to _shared/sendCandidateForm.ts so this path,
// the bulk path, and the automation path stay on a single code path.
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';
import { corsHeaders } from '../_shared/cors.ts';
import {
  createCandidateFormToken,
  dispatchCandidateFormInvite,
  revokeCandidateFormToken,
} from '../_shared/sendCandidateForm.ts';

interface Body {
  application_id: string;
  channel: 'email' | 'sms' | 'manual';
  expiry_days?: number;
  inbox_id?: string; // required for email channel (recruitment inbox)
  custom_message?: string;
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405);

  const authHeader = req.headers.get('Authorization');
  if (!authHeader) return json({ error: 'Unauthorized' }, 401);

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

  let body: Body;
  try {
    body = await req.json();
  } catch {
    return json({ error: 'Invalid JSON body' }, 400);
  }

  // Membership + profile lookup (org auth happens against the application's org).
  const { data: application } = await supabase
    .from('applications')
    .select('id, organization_id')
    .eq('id', body.application_id)
    .maybeSingle();
  if (!application) return json({ error: 'Application not found' }, 404);

  const { data: membership } = await supabase
    .from('organization_memberships')
    .select('id')
    .eq('user_id', authUserId)
    .eq('organization_id', application.organization_id)
    .eq('status', 'active')
    .maybeSingle();
  if (!membership) return json({ error: 'Forbidden' }, 403);

  const { data: profile } = await supabase
    .from('profiles')
    .select('id')
    .eq('user_id', authUserId)
    .maybeSingle();

  // Create token via shared helper.
  const result = await createCandidateFormToken(supabase, {
    application_id: body.application_id,
    channel: body.channel,
    expiry_days: body.expiry_days,
    created_by_profile_id: profile?.id ?? null,
  });

  if (!result.ok) {
    return json({ error: result.error, message: result.message }, result.status);
  }

  const { token_id, url, expires_at, applicant, position } = result;
  const customMessageHtml = body.custom_message?.trim()
    ? `<p>${body.custom_message.trim().replace(/</g, '&lt;').replace(/\n/g, '<br>')}</p>`
    : '';
  const customMessageText = body.custom_message?.trim() ? `${body.custom_message.trim()}\n\n` : '';

  // Dispatch via channel. Failure → auto-revoke so we don't leave orphan live tokens.
  let dispatchResult: any = null;
  try {
    if (body.channel === 'email') {
      if (!body.inbox_id) {
        await revokeCandidateFormToken(supabase, token_id, profile?.id ?? null, 'missing_inbox_id');
        return json({ error: 'inbox_id required for email channel' }, 400);
      }
      const firstName = applicant.first_name ?? '';
      const subject = `Vi trenger litt mer info – ${position.title}`;
      const bodyHtml = `
        <p>Hei ${firstName},</p>
        <p>Vi trenger litt mer info for søknaden din til <strong>${position.title}</strong>.</p>
        ${customMessageHtml}
        <p>Vennligst fyll ut skjemaet innen ${new Date(expires_at).toLocaleDateString('nb-NO')}:</p>
        <p><a href="${url}" style="display:inline-block;padding:12px 20px;background:#2563eb;color:#fff;text-decoration:none;border-radius:6px;">Åpne skjema</a></p>
        <p>Eller åpne lenken direkte:<br><a href="${url}">${url}</a></p>
        <p>Du vil bli bedt om å bekrefte de siste 4 sifrene i telefonnummeret ditt.</p>
      `;
      const { data: sendData, error: sendErr } = await supabase.functions.invoke('send-recruitment-email', {
        headers: { Authorization: authHeader },
        body: {
          applicant_id: applicant.id,
          inbox_id: body.inbox_id,
          subject,
          body_html: bodyHtml,
        },
      });
      if (sendErr || (sendData as any)?.error) {
        const msg = sendErr?.message ?? (sendData as any)?.error ?? 'Email dispatch failed';
        await revokeCandidateFormToken(supabase, token_id, profile?.id ?? null, `email_dispatch_failed: ${msg}`);
        return json({ error: 'email_dispatch_failed', message: msg }, 502);
      }
      dispatchResult = sendData;
    } else if (body.channel === 'sms') {
      const firstName = applicant.first_name ?? '';
      const smsBody = `Hei ${firstName}! ${customMessageText}Fyll ut skjemaet for ${position.title}: ${url} (utløper ${new Date(expires_at).toLocaleDateString('nb-NO')})`;
      const { data: sendData, error: sendErr } = await supabase.functions.invoke('send-recruitment-sms', {
        headers: { Authorization: authHeader },
        body: {
          applicant_id: applicant.id,
          inbox_id: body.inbox_id, // required by send-recruitment-sms
          body: smsBody,
        },
      });
      if (sendErr || (sendData as any)?.error) {
        const msg = sendErr?.message ?? (sendData as any)?.error ?? 'SMS dispatch failed';
        await revokeCandidateFormToken(supabase, token_id, profile?.id ?? null, `sms_dispatch_failed: ${msg}`);
        return json({
          error: 'sms_dispatch_failed',
          message: 'SMS-utsending feilet. Sjekk at Messente er konfigurert.',
          details: msg,
        }, 502);
      }
      dispatchResult = sendData;
    }
    // manual: nothing to dispatch — caller gets URL back
  } catch (e: any) {
    await revokeCandidateFormToken(supabase, token_id, profile?.id ?? null, `unexpected: ${e?.message ?? e}`);
    return json({ error: 'dispatch_failed', message: e?.message ?? String(e) }, 500);
  }

  return json({
    token_id,
    token: result.token,
    url,
    expires_at,
    channel: result.channel,
    dispatch: dispatchResult,
  });
});
