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
    },
    'candidate_form_sent',
    null,
    {
      channel: input.channel,
      expires_at: expiresAt,
      created_by_profile_id: input.created_by_profile_id,
    },
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
