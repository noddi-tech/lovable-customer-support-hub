// Cron-driven: mark expired candidate form tokens and emit audit events.
// Optionally hard-delete tokens >90 days old.
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';
import { corsHeaders } from '../_shared/cors.ts';

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  );

  const now = new Date().toISOString();

  // Find tokens that just expired (past expires_at, not yet used or revoked)
  const { data: expired, error: selectErr } = await supabase
    .from('candidate_form_tokens')
    .select('id, organization_id, applicant_id')
    .lt('expires_at', now)
    .is('used_at', null)
    .is('revoked_at', null);

  if (selectErr) {
    return json({ error: 'select_failed', details: selectErr.message }, 500);
  }

  let expiredCount = 0;
  if (expired && expired.length > 0) {
    // Mark them revoked (with reason via audit) so they don't keep appearing in cleanup
    const ids = expired.map((t) => t.id);
    await supabase
      .from('candidate_form_tokens')
      .update({ revoked_at: now })
      .in('id', ids);

    // Audit each
    const auditRows = expired.map((t) => ({
      organization_id: t.organization_id,
      event_type: 'candidate_form_expired',
      event_category: 'write',
      subject_table: 'candidate_form_tokens',
      subject_id: t.id,
      applicant_id: t.applicant_id,
    }));
    await supabase.from('recruitment_audit_events').insert(auditRows);
    expiredCount = expired.length;
  }

  // Hard-delete tokens older than 90 days
  const cutoff = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString();
  const { count: deletedCount } = await supabase
    .from('candidate_form_tokens')
    .delete({ count: 'exact' })
    .lt('created_at', cutoff);

  return json({
    success: true,
    expired: expiredCount,
    deleted: deletedCount ?? 0,
    ran_at: now,
  });
});
