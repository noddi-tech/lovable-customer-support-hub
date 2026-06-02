// Phase 12 M12.2 — Daily sweep of expired GDPR export files.
// For every gdpr_requests row of type=export whose fulfilled_at is older than
// the signed-URL TTL (7 days), delete the corresponding object in
// gdpr-exports bucket and null fulfillment_summary.download_url.
// The gdpr_requests row itself is preserved indefinitely as a compliance record.
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';
import { corsHeaders } from '../_shared/cors.ts';

const TTL_DAYS = 7;
const EXPORT_BUCKET = 'gdpr-exports';

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

  const cutoff = new Date(Date.now() - TTL_DAYS * 24 * 60 * 60 * 1000).toISOString();

  const { data: rows, error } = await supabase
    .from('gdpr_requests')
    .select('id, organization_id, fulfillment_summary, fulfilled_at')
    .eq('request_type', 'export')
    .eq('status', 'fulfilled')
    .lt('fulfilled_at', cutoff)
    .not('fulfillment_summary', 'is', null)
    .limit(500);

  if (error) return json({ error: error.message }, 500);

  let deleted = 0;
  let failed = 0;
  for (const row of rows ?? []) {
    const summary = (row.fulfillment_summary ?? {}) as any;
    const path: string | undefined = summary.storage_path;
    // Skip rows already swept
    if (!path || summary.expired === true) continue;

    const { error: rmErr } = await supabase.storage.from(EXPORT_BUCKET).remove([path]);
    if (rmErr) {
      console.error(`[cleanup-expired-gdpr-exports] remove failed for ${path}:`, rmErr.message);
      failed++;
      continue;
    }

    await supabase
      .from('gdpr_requests')
      .update({
        fulfillment_summary: {
          ...summary,
          download_url: null,
          expired: true,
          expired_at: new Date().toISOString(),
        },
      })
      .eq('id', row.id);

    await supabase.from('recruitment_audit_events').insert({
      organization_id: row.organization_id,
      event_type: 'gdpr_export_expired',
      event_category: 'system',
      subject_table: 'gdpr_requests',
      subject_id: row.id,
      context: { storage_path: path },
    });
    deleted++;
  }

  return json({ success: true, scanned: rows?.length ?? 0, deleted, failed, ran_at: new Date().toISOString() });
});
