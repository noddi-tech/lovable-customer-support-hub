// Shared utilities for candidate self-service form edge functions.
// Token validation, identity check, and field resolution.

const MAX_ATTEMPTS = 5;

export const BUILTIN_COLUMNS = [
  'location',
  'years_experience',
  'own_vehicle',
  'availability_date',
  'language_norwegian',
  'work_permit_status',
  'drivers_license_classes',
  'certifications',
] as const;

export type BuiltinColumn = (typeof BUILTIN_COLUMNS)[number];

export type TokenValidationOutcome =
  | { ok: true; token: TokenRow; applicant: ApplicantRow }
  | { ok: false; status: number; body: Record<string, unknown> };

export interface TokenRow {
  id: string;
  organization_id: string;
  application_id: string;
  applicant_id: string;
  token: string;
  expires_at: string;
  used_at: string | null;
  revoked_at: string | null;
  attempts: number;
  opened_at: string | null;
}

export interface ApplicantRow {
  id: string;
  first_name: string | null;
  last_name: string | null;
  phone: string | null;
}

/** Extract last 4 digits from a phone string (strips all non-digits first). */
export function lastFourDigits(phone: string | null | undefined): string | null {
  if (!phone) return null;
  const digits = phone.replace(/\D/g, '');
  if (digits.length < 4) return null;
  return digits.slice(-4);
}

/**
 * Validate token + identity check.
 * Anti-enumeration: all token-state failures return identical message.
 * Identity check failures return attempts_remaining.
 */
export async function validateTokenAndIdentity(
  supabase: any,
  rawToken: string,
  phoneLast4: string,
  clientIp: string | null,
): Promise<TokenValidationOutcome> {
  if (!rawToken || typeof rawToken !== 'string') {
    return { ok: false, status: 400, body: { valid: false, reason: 'invalid_or_expired' } };
  }
  const cleanLast4 = String(phoneLast4 ?? '').replace(/\D/g, '');
  if (cleanLast4.length !== 4) {
    return { ok: false, status: 400, body: { valid: false, reason: 'invalid_input' } };
  }

  const { data: token, error: tokenErr } = await supabase
    .from('candidate_form_tokens')
    .select(
      'id, organization_id, application_id, applicant_id, token, expires_at, used_at, revoked_at, attempts, opened_at',
    )
    .eq('token', rawToken)
    .maybeSingle();

  if (tokenErr || !token) {
    return { ok: false, status: 404, body: { valid: false, reason: 'invalid_or_expired' } };
  }

  // Terminal/recoverable states: return HTTP 200 with { valid: false, reason }
  // so supabase.functions.invoke() exposes the body in `data` instead of
  // collapsing into a generic `error` (memory #4).
  // Token-state checks take precedence over identity check — a revoked or
  // expired token must NOT show "wrong digits" even with correct input.
  const now = new Date();
  if (token.used_at) {
    return { ok: false, status: 200, body: { valid: false, reason: 'already_submitted' } };
  }
  if (token.revoked_at) {
    return { ok: false, status: 200, body: { valid: false, reason: 'revoked' } };
  }
  if (new Date(token.expires_at) <= now) {
    return { ok: false, status: 200, body: { valid: false, reason: 'invalid_or_expired' } };
  }
  if (token.attempts >= MAX_ATTEMPTS) {
    return { ok: false, status: 200, body: { valid: false, reason: 'too_many_attempts' } };
  }

  const { data: applicant, error: applicantErr } = await supabase
    .from('applicants')
    .select('id, first_name, last_name, phone')
    .eq('id', token.applicant_id)
    .maybeSingle();

  if (applicantErr || !applicant) {
    return { ok: false, status: 404, body: { valid: false, reason: 'invalid_or_expired' } };
  }

  const expectedLast4 = lastFourDigits(applicant.phone);
  if (!expectedLast4 || expectedLast4 !== cleanLast4) {
    const newAttempts = token.attempts + 1;
    await supabase
      .from('candidate_form_tokens')
      .update({
        attempts: newAttempts,
        last_attempt_at: now.toISOString(),
        last_attempt_ip: clientIp,
      })
      .eq('id', token.id);

    await logAudit(supabase, token, 'candidate_form_id_check_failed', clientIp, {
      attempts: newAttempts,
    });

    return {
      ok: false,
      status: 200,
      body: {
        valid: false,
        reason: newAttempts >= MAX_ATTEMPTS ? 'too_many_attempts' : 'identity_check_failed',
        attempts_remaining: Math.max(0, MAX_ATTEMPTS - newAttempts),
      },
    };
  }

  // First successful validation → mark opened_at + audit
  if (!token.opened_at) {
    await supabase
      .from('candidate_form_tokens')
      .update({ opened_at: now.toISOString() })
      .eq('id', token.id);
    await logAudit(supabase, token, 'candidate_form_opened', clientIp, null);
  }

  return { ok: true, token, applicant };
}

// User-visible candidate-form lifecycle events also get mirrored into
// application_events so the Hendelser timeline (Oversikt tab) renders them.
// Internal/noise types (id_check_failed, auto_revoked) stay audit-only.
const TIMELINE_MIRRORED_EVENTS = new Set([
  'candidate_form_sent',
  'candidate_form_opened',
  'candidate_form_submitted',
  'candidate_form_revoked',
]);

export async function logAudit(
  supabase: any,
  token: Pick<TokenRow, 'organization_id' | 'applicant_id' | 'id'> & { application_id?: string },
  eventType: string,
  clientIp: string | null,
  context: Record<string, unknown> | null,
  opts?: { performed_by?: string | null; application_id?: string },
) {
  await supabase.from('recruitment_audit_events').insert({
    organization_id: token.organization_id,
    event_type: eventType,
    event_category: 'write',
    subject_table: 'candidate_form_tokens',
    subject_id: token.id,
    applicant_id: token.applicant_id,
    ip_address: clientIp,
    context: context ?? null,
  });

  if (TIMELINE_MIRRORED_EVENTS.has(eventType)) {
    const applicationId = opts?.application_id ?? (token as any).application_id;
    if (applicationId) {
      const { error: mirrorErr } = await supabase.from('application_events').insert({
        organization_id: token.organization_id,
        application_id: applicationId,
        applicant_id: token.applicant_id,
        event_type: eventType,
        event_data: { ...(context ?? {}), token_id: token.id },
        performed_by: opts?.performed_by ?? null,
      });
      if (mirrorErr) {
        console.error('[candidateForm] timeline mirror failed', {
          event_type: eventType,
          application_id: applicationId,
          applicant_id: token.applicant_id,
          error: mirrorErr.message,
        });
      }
    } else {
      console.warn('[candidateForm] timeline mirror skipped — missing application_id', {
        event_type: eventType,
        applicant_id: token.applicant_id,
      });
    }
  }
}

export function getClientIp(req: Request): string | null {
  const xff = req.headers.get('x-forwarded-for');
  if (xff) return xff.split(',')[0].trim();
  return req.headers.get('cf-connecting-ip') ?? null;
}

/**
 * Resolve the smart-form field list for an applicant's current stage.
 * Returns required + optional custom fields plus the 8 built-in scoring columns
 * (always optional). Includes existing values for editable pre-fill.
 */
export async function resolveFormFields(
  supabase: any,
  applicationId: string,
  applicantId: string,
) {
  const { data: app } = await supabase
    .from('applications')
    .select('id, position_id, current_stage_id, organization_id')
    .eq('id', applicationId)
    .maybeSingle();

  if (!app?.current_stage_id) {
    return { custom_fields: [], builtin_columns: [], position: null, stage_id: null };
  }

  const { data: position } = await supabase
    .from('job_positions')
    .select('id, title, candidate_form_enabled, candidate_form_intro_text, pipeline_id')
    .eq('id', app.position_id)
    .maybeSingle();

  // Stage requirements: org-wide (position_id null) OR this position
  const { data: reqs } = await supabase
    .from('pipeline_stage_field_requirements')
    .select('custom_field_id, requirement_type, display_order, position_id')
    .eq('stage_id', app.current_stage_id)
    .or(`position_id.is.null,position_id.eq.${app.position_id}`);

  const fieldIds = Array.from(new Set((reqs ?? []).map((r: any) => r.custom_field_id)));
  let fields: any[] = [];
  if (fieldIds.length > 0) {
    const { data } = await supabase
      .from('recruitment_custom_fields')
      .select('id, name, field_type, options, display_order')
      .in('id', fieldIds);
    fields = data ?? [];
  }

  // Existing values to pre-fill
  const { data: existingValues } = await supabase
    .from('recruitment_applicant_field_values')
    .select('field_id, value')
    .eq('applicant_id', applicantId);

  const valuesMap = new Map((existingValues ?? []).map((v: any) => [v.field_id, v.value]));

  // Merge: position-specific overrides org-wide for same field
  const reqMap = new Map<string, any>();
  for (const r of reqs ?? []) {
    const existing = reqMap.get(r.custom_field_id);
    if (!existing || (existing.position_id === null && r.position_id !== null)) {
      reqMap.set(r.custom_field_id, r);
    }
  }

  const custom_fields = fields
    .map((f) => {
      const req = reqMap.get(f.id);
      return {
        field_id: f.id,
        field_name: f.name,
        field_type: f.field_type,
        options: f.options,
        requirement_type: req?.requirement_type ?? 'optional',
        display_order: req?.display_order ?? f.display_order ?? 0,
        current_value: valuesMap.get(f.id) ?? null,
      };
    })
    .sort((a, b) => {
      // Required first, then by display_order
      if (a.requirement_type !== b.requirement_type) {
        return a.requirement_type === 'required' ? -1 : 1;
      }
      return a.display_order - b.display_order;
    });

  // Builtin columns (always optional in self-service form)
  const { data: applicantRow } = await supabase
    .from('applicants')
    .select(BUILTIN_COLUMNS.join(', '))
    .eq('id', applicantId)
    .maybeSingle();

  const builtin_columns = BUILTIN_COLUMNS.map((key) => ({
    key,
    current_value: applicantRow ? (applicantRow as any)[key] ?? null : null,
  }));

  return {
    custom_fields,
    builtin_columns,
    position: position ? { title: position.title, intro_text: position.candidate_form_intro_text } : null,
    stage_id: app.current_stage_id,
  };
}
