// Public endpoint: submit the candidate form. Writes field values + builtin columns,
// marks the token used, and lets existing DB triggers enqueue re-scoring.
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';
import { corsHeaders } from '../_shared/cors.ts';
import {
  validateTokenAndIdentity,
  logAudit,
  getClientIp,
  BUILTIN_COLUMNS,
  type BuiltinColumn,
} from '../_shared/candidateFormUtils.ts';

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

interface Body {
  token?: string;
  phone_last_4?: string;
  custom_field_values?: Record<string, unknown>;
  builtin_columns?: Partial<Record<BuiltinColumn, unknown>>;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405);

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  );

  let body: Body;
  try {
    body = await req.json();
  } catch {
    return json({ success: false, reason: 'invalid_input' }, 400);
  }

  const clientIp = getClientIp(req);
  const result = await validateTokenAndIdentity(
    supabase,
    body.token ?? '',
    body.phone_last_4 ?? '',
    clientIp,
  );

  if (!result.ok) {
    return json(result.body, result.status);
  }

  const tokenRow = result.token;

  // Upsert custom field values
  const customFieldValues = body.custom_field_values ?? {};
  const fieldEntries = Object.entries(customFieldValues).filter(
    ([fieldId, value]) => fieldId && value !== undefined && value !== null && value !== '',
  );

  if (fieldEntries.length > 0) {
    const rows = fieldEntries.map(([field_id, value]) => ({
      applicant_id: tokenRow.applicant_id,
      field_id,
      value: typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean'
        ? value
        : value,
      raw_value: typeof value === 'string' ? value : JSON.stringify(value),
    }));
    const { error: upsertErr } = await supabase
      .from('recruitment_applicant_field_values')
      .upsert(rows, { onConflict: 'applicant_id,field_id' });
    if (upsertErr) {
      return json({ success: false, error: 'Failed to save field values', details: upsertErr.message }, 500);
    }
  }

  // Update applicant builtin columns
  const builtinUpdate: Record<string, unknown> = {};
  const builtinIn = body.builtin_columns ?? {};
  for (const key of BUILTIN_COLUMNS) {
    if (key in builtinIn) {
      const v = (builtinIn as any)[key];
      if (v !== undefined) {
        builtinUpdate[key] = v === '' ? null : v;
      }
    }
  }
  if (Object.keys(builtinUpdate).length > 0) {
    const { error: applicantErr } = await supabase
      .from('applicants')
      .update(builtinUpdate)
      .eq('id', tokenRow.applicant_id);
    if (applicantErr) {
      return json({ success: false, error: 'Failed to update applicant', details: applicantErr.message }, 500);
    }
  }

  // Mark token used
  const now = new Date().toISOString();
  await supabase
    .from('candidate_form_tokens')
    .update({
      used_at: now,
      submitted_at: now,
      submitted_ip: clientIp,
      submitted_user_agent: req.headers.get('user-agent'),
    })
    .eq('id', tokenRow.id);

  await logAudit(supabase, tokenRow, 'candidate_form_submitted', clientIp, {
    custom_fields_filled: fieldEntries.length,
    builtin_fields_filled: Object.keys(builtinUpdate).length,
  });

  return json({
    success: true,
    message: 'Takk! Du hører fra oss snart.',
  });
});
