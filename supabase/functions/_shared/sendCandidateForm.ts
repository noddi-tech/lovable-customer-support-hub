// Shared candidate-form-token issuance helper.
//
// One code path for: recruiter "Send skjema" dialog, bulk send,
// and automation rule action `send_candidate_form`.
//
// Responsibilities:
//   - Validate application, applicant.phone (identity check feasibility),
//     position config (candidate_form_enabled).
//   - Resolve expiry (explicit > org default > 7 days).
//   - Insert candidate_form_tokens row.
//   - Build public URL.
//   - Log audit event (event_category='write').
//
// Dispatch (email/SMS send) is the caller's responsibility — the user-auth
// path uses send-recruitment-{email,sms} (proper attribution + threading);
// the system/automation path posts directly to send-email with service role.

import { logAudit } from './candidateFormUtils.ts';
import { substituteVars } from './sendOutboundEmail.ts';

const NEUTRAL_BRAND_COLOR = '#111827';

function formatOsloDate(iso: string): string {
  try {
    return new Intl.DateTimeFormat('nb-NO', {
      dateStyle: 'long',
      timeStyle: 'short',
      timeZone: 'Europe/Oslo',
    }).format(new Date(iso));
  } catch {
    return new Date(iso).toLocaleDateString('nb-NO');
  }
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

interface TemplateLookup {
  subject: string;
  body: string;
  found: boolean;
}

async function loadInvitationTemplate(
  supabase: any,
  organizationId: string,
  channel: 'email' | 'sms',
): Promise<TemplateLookup> {
  const name =
    channel === 'email'
      ? 'Kandidatskjema – invitasjon'
      : 'Kandidatskjema – invitasjon (SMS)';
  const { data, error } = await supabase
    .from('recruitment_email_templates')
    .select('subject, body, is_active, soft_deleted_at')
    .eq('organization_id', organizationId)
    .eq('name', name)
    .eq('type', channel)
    .is('soft_deleted_at', null)
    .maybeSingle();
  if (error) {
    console.warn('[candidateForm] template lookup error', error.message);
    return { subject: '', body: '', found: false };
  }
  if (!data || data.is_active === false) {
    if (data && data.is_active === false) {
      console.warn(
        `[candidateForm] template inactive, falling back: org=${organizationId} channel=${channel}`,
      );
    } else {
      console.warn(
        `[candidateForm] template missing, falling back: org=${organizationId} channel=${channel}`,
      );
    }
    return { subject: '', body: '', found: false };
  }
  return { subject: data.subject ?? '', body: data.body ?? '', found: true };
}

async function loadOrgBranding(
  supabase: any,
  organizationId: string,
): Promise<{ name: string; brand_color: string }> {
  const { data } = await supabase
    .from('organizations')
    .select('name, primary_color, candidate_form_brand_color')
    .eq('id', organizationId)
    .maybeSingle();
  return {
    name: data?.name ?? '',
    brand_color:
      data?.candidate_form_brand_color ||
      data?.primary_color ||
      NEUTRAL_BRAND_COLOR,
  };
}

async function loadRecruiterName(
  supabase: any,
  profileId: string | null,
): Promise<string> {
  if (!profileId) return '';
  const { data } = await supabase
    .from('profiles')
    .select('full_name')
    .eq('id', profileId)
    .maybeSingle();
  return data?.full_name ?? '';
}

export interface CreateTokenInput {
  application_id: string;
  channel: 'email' | 'sms' | 'manual';
  expiry_days?: number | null;
  /** Profile id of the recruiter creating it; null = system/automation. */
  created_by_profile_id: string | null;
}

export interface CreateTokenSuccess {
  ok: true;
  token_id: string;
  token: string;
  url: string;
  expires_at: string;
  channel: string;
  organization_id: string;
  applicant: {
    id: string;
    first_name: string | null;
    last_name: string | null;
    email: string | null;
    phone: string | null;
  };
  position: { id: string; title: string };
}

export interface CreateTokenFailure {
  ok: false;
  status: number;
  error: string;
  message?: string;
}

export type CreateTokenResult = CreateTokenSuccess | CreateTokenFailure;

function lastFourDigits(phone: string | null | undefined): string | null {
  if (!phone) return null;
  const digits = phone.replace(/\D/g, '');
  return digits.length >= 4 ? digits.slice(-4) : null;
}

/** Service-role only — caller authorization must happen upstream. */
export async function createCandidateFormToken(
  supabase: any,
  input: CreateTokenInput,
): Promise<CreateTokenResult> {
  if (!input.application_id) {
    return { ok: false, status: 400, error: 'application_id required' };
  }
  if (!['email', 'sms', 'manual'].includes(input.channel)) {
    return { ok: false, status: 400, error: 'channel must be email, sms, or manual' };
  }

  const { data: application } = await supabase
    .from('applications')
    .select('id, organization_id, applicant_id, position_id')
    .eq('id', input.application_id)
    .maybeSingle();
  if (!application) return { ok: false, status: 404, error: 'Application not found' };

  const { data: applicant } = await supabase
    .from('applicants')
    .select('id, phone, email, first_name, last_name')
    .eq('id', application.applicant_id)
    .maybeSingle();
  if (!applicant) return { ok: false, status: 404, error: 'Applicant not found' };

  if (!lastFourDigits(applicant.phone)) {
    return {
      ok: false,
      status: 422,
      error: 'missing_phone',
      message: 'Søkeren har ikke gyldig telefonnummer registrert. Legg til telefonnummer først.',
    };
  }

  const { data: position } = await supabase
    .from('job_positions')
    .select('id, title, candidate_form_enabled')
    .eq('id', application.position_id)
    .maybeSingle();
  if (!position) return { ok: false, status: 404, error: 'Position not found' };
  if (position.candidate_form_enabled === false) {
    return {
      ok: false,
      status: 422,
      error: 'forms_disabled',
      message: 'Kandidatskjema er deaktivert for denne stillingen.',
    };
  }

  const { data: org } = await supabase
    .from('organizations')
    .select('candidate_form_default_expiry_days')
    .eq('id', application.organization_id)
    .maybeSingle();
  const expiryDays =
    input.expiry_days ?? org?.candidate_form_default_expiry_days ?? 7;
  const expiresAt = new Date(Date.now() + expiryDays * 24 * 60 * 60 * 1000).toISOString();

  const token = crypto.randomUUID();

  const { data: tokenRow, error: insertErr } = await supabase
    .from('candidate_form_tokens')
    .insert({
      organization_id: application.organization_id,
      application_id: application.id,
      applicant_id: application.applicant_id,
      token,
      created_by: input.created_by_profile_id,
      expires_at: expiresAt,
      channel: input.channel,
    })
    .select('id, token, expires_at, channel')
    .single();

  if (insertErr || !tokenRow) {
    return {
      ok: false,
      status: 500,
      error: 'token_insert_failed',
      message: insertErr?.message ?? 'Failed to create token',
    };
  }

  const publicBase = Deno.env.get('PUBLIC_APP_URL') ?? 'https://support.noddi.co';
  const url = `${publicBase}/apply/form/${token}`;

  await logAudit(
    supabase,
    {
      id: tokenRow.id,
      organization_id: application.organization_id,
      applicant_id: application.applicant_id,
      application_id: application.id,
    },
    'candidate_form_sent',
    null,
    {
      channel: input.channel,
      expires_at: expiresAt,
      created_by_profile_id: input.created_by_profile_id,
    },
    { performed_by: input.created_by_profile_id, application_id: application.id },
  );

  return {
    ok: true,
    token_id: tokenRow.id,
    token: tokenRow.token,
    url,
    expires_at: tokenRow.expires_at,
    channel: tokenRow.channel,
    organization_id: application.organization_id,
    applicant: {
      id: applicant.id,
      first_name: applicant.first_name,
      last_name: applicant.last_name,
      email: applicant.email,
      phone: applicant.phone,
    },
    position: { id: position.id, title: position.title },
  };
}

/** Revoke a token created above; used by callers on dispatch failure. */
export async function revokeCandidateFormToken(
  supabase: any,
  tokenId: string,
  revokedByProfileId: string | null,
  reason: string,
) {
  await supabase
    .from('candidate_form_tokens')
    .update({
      revoked_at: new Date().toISOString(),
      revoked_by: revokedByProfileId,
    })
    .eq('id', tokenId)
    .is('revoked_at', null)
    .is('used_at', null);

  // Audit the auto-revoke so the history shows why the token disappeared.
  const { data: t } = await supabase
    .from('candidate_form_tokens')
    .select('id, organization_id, applicant_id')
    .eq('id', tokenId)
    .maybeSingle();
  if (t) {
    await logAudit(supabase, t, 'candidate_form_auto_revoked', null, { reason });
  }
}

/** Build the public form URL from a raw token. */
export function buildFormUrl(token: string): string {
  const publicBase = Deno.env.get('PUBLIC_APP_URL') ?? 'https://support.noddi.co';
  return `${publicBase}/apply/form/${token}`;
}

/**
 * Dispatch a candidate-form invite via email/SMS using a recruiter's JWT
 * (delegates to send-recruitment-email / send-recruitment-sms for proper
 * threading + attribution). Auto-revokes the token on failure.
 *
 * Caller still owns the token — pass token_id back so it can be revoked
 * on outer-level failures.
 */
export async function dispatchCandidateFormInvite(
  supabase: any,
  args: {
    token_id: string;
    url: string;
    expires_at: string;
    channel: 'email' | 'sms';
    inbox_id?: string;
    custom_message?: string;
    applicant: { id: string; first_name: string | null };
    position: { title: string };
    auth_header: string;
    revoked_by_profile_id: string | null;
  },
): Promise<
  | { ok: true; dispatch: any }
  | { ok: false; status: number; error: string; message?: string }
> {
  const customHtml = args.custom_message?.trim()
    ? `<p>${args.custom_message.trim().replace(/</g, '&lt;').replace(/\n/g, '<br>')}</p>`
    : '';
  const customText = args.custom_message?.trim() ? `${args.custom_message.trim()}\n\n` : '';
  const firstName = args.applicant.first_name ?? '';
  const expiresHuman = new Date(args.expires_at).toLocaleDateString('nb-NO');

  if (args.channel === 'email') {
    if (!args.inbox_id) {
      await revokeCandidateFormToken(supabase, args.token_id, args.revoked_by_profile_id, 'missing_inbox_id');
      return { ok: false, status: 400, error: 'inbox_id required for email channel' };
    }
    const subject = `Vi trenger litt mer info – ${args.position.title}`;
    const bodyHtml = `
      <p>Hei ${firstName},</p>
      <p>Vi trenger litt mer info for søknaden din til <strong>${args.position.title}</strong>.</p>
      ${customHtml}
      <p>Vennligst fyll ut skjemaet innen ${expiresHuman}:</p>
      <p><a href="${args.url}" style="display:inline-block;padding:12px 20px;background:#2563eb;color:#fff;text-decoration:none;border-radius:6px;">Åpne skjema</a></p>
      <p>Eller åpne lenken direkte:<br><a href="${args.url}">${args.url}</a></p>
      <p>Du vil bli bedt om å bekrefte de siste 4 sifrene i telefonnummeret ditt.</p>
    `;
    const { data, error } = await supabase.functions.invoke('send-recruitment-email', {
      headers: { Authorization: args.auth_header },
      body: {
        applicant_id: args.applicant.id,
        inbox_id: args.inbox_id,
        subject,
        body_html: bodyHtml,
      },
    });
    if (error || (data as any)?.error) {
      const msg = error?.message ?? (data as any)?.error ?? 'Email dispatch failed';
      await revokeCandidateFormToken(supabase, args.token_id, args.revoked_by_profile_id, `email_dispatch_failed: ${msg}`);
      return { ok: false, status: 502, error: 'email_dispatch_failed', message: msg };
    }
    return { ok: true, dispatch: data };
  }

  // SMS
  const smsBody = `Hei ${firstName}! ${customText}Fyll ut skjemaet for ${args.position.title}: ${args.url} (utløper ${expiresHuman})`;
  const { data, error } = await supabase.functions.invoke('send-recruitment-sms', {
    headers: { Authorization: args.auth_header },
    body: {
      applicant_id: args.applicant.id,
      inbox_id: args.inbox_id,
      body: smsBody,
    },
  });
  if (error || (data as any)?.error) {
    const msg = error?.message ?? (data as any)?.error ?? 'SMS dispatch failed';
    await revokeCandidateFormToken(supabase, args.token_id, args.revoked_by_profile_id, `sms_dispatch_failed: ${msg}`);
    return {
      ok: false,
      status: 502,
      error: 'sms_dispatch_failed',
      message: 'SMS-utsending feilet. Sjekk at Messente er konfigurert.',
    };
  }
  return { ok: true, dispatch: data };
}
