// Recruiter-initiated: create a candidate form token and optionally dispatch via email/SMS.
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';
import { corsHeaders } from '../_shared/cors.ts';
import { logAudit, lastFourDigits } from '../_shared/candidateFormUtils.ts';

interface Body {
  application_id: string;
  channel: 'email' | 'sms' | 'manual';
  expiry_days?: number;
  inbox_id?: string; // required for email channel
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

  if (!body.application_id || !body.channel) {
    return json({ error: 'application_id and channel are required' }, 400);
  }
  if (!['email', 'sms', 'manual'].includes(body.channel)) {
    return json({ error: 'channel must be email, sms, or manual' }, 400);
  }

  // Resolve application + applicant + org
  const { data: application, error: appErr } = await supabase
    .from('applications')
    .select('id, organization_id, applicant_id, position_id')
    .eq('id', body.application_id)
    .maybeSingle();

  if (appErr || !application) return json({ error: 'Application not found' }, 404);

  // Verify caller is org member
  const { data: membership } = await supabase
    .from('organization_memberships')
    .select('id')
    .eq('user_id', authUserId)
    .eq('organization_id', application.organization_id)
    .eq('status', 'active')
    .maybeSingle();
  if (!membership) return json({ error: 'Forbidden' }, 403);

  // Get caller profile_id (for created_by)
  const { data: profile } = await supabase
    .from('profiles')
    .select('id')
    .eq('user_id', authUserId)
    .maybeSingle();

  // Check applicant has phone (identity check requires last 4 digits)
  const { data: applicant } = await supabase
    .from('applicants')
    .select('id, phone, email, first_name, last_name')
    .eq('id', application.applicant_id)
    .maybeSingle();
  if (!applicant) return json({ error: 'Applicant not found' }, 404);

  if (!lastFourDigits(applicant.phone)) {
    return json({
      error: 'missing_phone',
      message: 'Søkeren har ikke gyldig telefonnummer registrert. Legg til telefonnummer først.',
    }, 422);
  }

  // Check position config
  const { data: position } = await supabase
    .from('job_positions')
    .select('id, title, candidate_form_enabled')
    .eq('id', application.position_id)
    .maybeSingle();
  if (!position) return json({ error: 'Position not found' }, 404);
  if (position.candidate_form_enabled === false) {
    return json({
      error: 'forms_disabled',
      message: 'Kandidatskjema er deaktivert for denne stillingen.',
    }, 422);
  }

  // Resolve expiry: explicit > org default > 7
  const { data: org } = await supabase
    .from('organizations')
    .select('candidate_form_default_expiry_days')
    .eq('id', application.organization_id)
    .maybeSingle();
  const expiryDays = body.expiry_days
    ?? org?.candidate_form_default_expiry_days
    ?? 7;
  const expiresAt = new Date(Date.now() + expiryDays * 24 * 60 * 60 * 1000).toISOString();

  // Generate token
  const token = crypto.randomUUID();

  const { data: tokenRow, error: insertErr } = await supabase
    .from('candidate_form_tokens')
    .insert({
      organization_id: application.organization_id,
      application_id: application.id,
      applicant_id: application.applicant_id,
      token,
      created_by: profile?.id ?? null,
      expires_at: expiresAt,
      channel: body.channel,
    })
    .select('id, token, expires_at, channel')
    .single();

  if (insertErr || !tokenRow) {
    return json({ error: 'Failed to create token', details: insertErr?.message }, 500);
  }

  const publicBase = Deno.env.get('PUBLIC_APP_URL') ?? 'https://support.noddi.co';
  const formUrl = `${publicBase}/apply/form/${token}`;

  // Dispatch via channel
  let dispatchResult: any = null;
  if (body.channel === 'email') {
    if (!body.inbox_id) {
      return json({ error: 'inbox_id required for email channel' }, 400);
    }
    const firstName = applicant.first_name ?? '';
    const subject = `Vi trenger litt mer info – ${position.title}`;
    const bodyHtml = `
      <p>Hei ${firstName},</p>
      <p>Vi trenger litt mer info for søknaden din til <strong>${position.title}</strong>.</p>
      <p>Vennligst fyll ut skjemaet innen ${new Date(expiresAt).toLocaleDateString('nb-NO')}:</p>
      <p><a href="${formUrl}" style="display:inline-block;padding:12px 20px;background:#2563eb;color:#fff;text-decoration:none;border-radius:6px;">Åpne skjema</a></p>
      <p>Eller åpne lenken direkte:<br><a href="${formUrl}">${formUrl}</a></p>
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
    if (sendErr) {
      return json({ error: 'Email dispatch failed', details: sendErr.message ?? String(sendErr) }, 502);
    }
    dispatchResult = sendData;
  } else if (body.channel === 'sms') {
    const firstName = applicant.first_name ?? '';
    const smsBody = `Hei ${firstName}! Fyll ut skjemaet for ${position.title}: ${formUrl} (utløper ${new Date(expiresAt).toLocaleDateString('nb-NO')})`;
    const { data: sendData, error: sendErr } = await supabase.functions.invoke('send-recruitment-sms', {
      headers: { Authorization: authHeader },
      body: {
        applicant_id: applicant.id,
        body: smsBody,
      },
    });
    if (sendErr) {
      return json({
        error: 'sms_dispatch_failed',
        message: 'SMS-utsending feilet. Sjekk at Messente er konfigurert.',
        details: sendErr.message ?? String(sendErr),
      }, 502);
    }
    dispatchResult = sendData;
  }
  // manual: nothing to dispatch — caller gets URL back

  await logAudit(supabase,
    { id: tokenRow.id, organization_id: application.organization_id, applicant_id: application.applicant_id },
    'candidate_form_sent',
    null,
    { channel: body.channel, expires_at: expiresAt },
  );

  return json({
    token_id: tokenRow.id,
    token,
    url: formUrl,
    expires_at: tokenRow.expires_at,
    channel: tokenRow.channel,
    dispatch: dispatchResult,
  });
});
