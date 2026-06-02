// Phase 12 M12.2 — Fulfill GDPR Article 17 erasure (internal/service-role only).
// Pipeline: invoke gdpr_erase_applicant RPC (atomic) → delete storage objects
//           → update request row with summary → audit.
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';
import { corsHeaders } from '../_shared/cors.ts';
import { anonymizeApplicant } from '../_shared/gdprAnonymizer.ts';

interface Body {
  request_id: string;
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let result = 0;
  for (let i = 0; i < a.length; i++) result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return result === 0;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405);

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

  const authHeader = req.headers.get('Authorization') ?? '';
  const expected = `Bearer ${serviceKey}`;
  if (!timingSafeEqual(authHeader, expected)) {
    return json({ error: 'Forbidden — service role required' }, 403);
  }

  let body: Body;
  try {
    body = await req.json();
  } catch {
    return json({ error: 'Invalid JSON body' }, 400);
  }
  if (!body.request_id) return json({ error: 'request_id required' }, 400);

  const supabase = createClient(supabaseUrl, serviceKey);

  const { data: request, error: reqErr } = await supabase
    .from('gdpr_requests')
    .select('*')
    .eq('id', body.request_id)
    .maybeSingle();
  if (reqErr || !request) return json({ error: 'request_not_found' }, 404);
  if (request.request_type !== 'erasure') return json({ error: 'wrong_request_type' }, 400);
  if (request.status === 'fulfilled') return json({ ok: true, already_fulfilled: true });
  if (!request.applicant_id) return json({ error: 'applicant_id missing' }, 400);

  try {
    // 1. Atomic RPC + storage cleanup
    const summary = await anonymizeApplicant(
      supabase,
      request.applicant_id,
      request.id,
    );

    // 2. Mark request fulfilled
    await supabase
      .from('gdpr_requests')
      .update({
        status: 'fulfilled',
        fulfilled_at: new Date().toISOString(),
        fulfillment_summary: summary as any,
      })
      .eq('id', request.id);

    // 3. Audit
    await supabase.from('recruitment_audit_events').insert({
      organization_id: request.organization_id,
      event_type: 'gdpr_erasure_fulfilled',
      event_category: 'write',
      subject_table: 'gdpr_requests',
      subject_id: request.id,
      applicant_id: request.applicant_id,
      actor_profile_id: request.requested_by,
      context: {
        already_anonymized: summary.already_anonymized,
        tables_affected: summary.tables_affected,
        files_deleted: summary.files_deleted,
        files_failed: summary.files_failed,
      },
    });

    return json({ ok: true, summary });
  } catch (e: any) {
    const msg = e?.message ?? String(e);
    console.error('[fulfill-gdpr-erasure] failed', msg);
    await supabase
      .from('gdpr_requests')
      .update({ status: 'failed', error_message: msg })
      .eq('id', request.id);
    await supabase.from('recruitment_audit_events').insert({
      organization_id: request.organization_id,
      event_type: 'gdpr_erasure_failed',
      event_category: 'write',
      subject_table: 'gdpr_requests',
      subject_id: request.id,
      applicant_id: request.applicant_id,
      actor_profile_id: request.requested_by,
      context: { error: msg },
    });
    return json({ error: 'fulfillment_failed', message: msg }, 500);
  }
});
