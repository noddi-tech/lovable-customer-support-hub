// Phase 12 M12.2 — Fulfill GDPR Article 15+20 export (internal/service-role only).
// Pipeline: collect data → render PDF → download applicant files → build ZIP
//           → upload to gdpr-exports bucket → sign URL → update request row.
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';
import { corsHeaders } from '../_shared/cors.ts';
import { collectApplicantData } from '../_shared/gdprDataCollector.ts';
import { buildGdprPdf } from '../_shared/gdprPdfBuilder.ts';
import { buildGdprZip } from '../_shared/gdprZipBuilder.ts';

const SIGNED_URL_TTL_SECONDS = 7 * 24 * 60 * 60; // 7 days
const APPLICANT_FILES_BUCKET = 'applicant-files';
const EXPORT_BUCKET = 'gdpr-exports';

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

  // Gate: only callers presenting the service-role key may invoke fulfill.
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

  // Load the request row
  const { data: request, error: reqErr } = await supabase
    .from('gdpr_requests')
    .select('*')
    .eq('id', body.request_id)
    .maybeSingle();
  if (reqErr || !request) return json({ error: 'request_not_found' }, 404);
  if (request.request_type !== 'export') {
    return json({ error: 'wrong_request_type' }, 400);
  }
  if (request.status === 'fulfilled') {
    return json({ ok: true, already_fulfilled: true });
  }
  if (!request.applicant_id) {
    return json({ error: 'applicant_id missing on request' }, 400);
  }

  try {
    // 1. Collect data
    const data = await collectApplicantData(supabase, request.applicant_id);

    // 2. Load org name for branding
    const { data: org } = await supabase
      .from('organizations')
      .select('name')
      .eq('id', request.organization_id)
      .maybeSingle();

    // 3. Build PDF
    const reportPdf = await buildGdprPdf(data, {
      requestId: request.id,
      organizationName: org?.name,
    });

    // 4. Download applicant files from bucket (best-effort)
    const files: { name: string; data: Uint8Array }[] = [];
    let filesFailed = 0;
    for (const f of data.files) {
      if (!f.storage_path) continue;
      const { data: blob, error: dlErr } = await supabase.storage
        .from(APPLICANT_FILES_BUCKET)
        .download(f.storage_path);
      if (dlErr || !blob) {
        filesFailed++;
        console.error(`[fulfill-gdpr-export] download failed: ${f.storage_path}`, dlErr);
        continue;
      }
      const buf = new Uint8Array(await blob.arrayBuffer());
      files.push({ name: f.file_name || f.id, data: buf });
    }

    // 5. Manifest
    const manifest = {
      gdpr_request_id: request.id,
      applicant_id: request.applicant_id,
      organization_id: request.organization_id,
      organization_name: org?.name ?? null,
      exported_at: new Date().toISOString(),
      file_count: files.length,
      files_failed: filesFailed,
      format_version: 1,
      contents: ['manifest.json', 'data.json', 'report.pdf', 'files/'],
    };

    // 6. ZIP
    const zip = buildGdprZip({
      manifest,
      dataJson: data,
      reportPdf,
      files,
    });

    // 7. Upload to bucket
    const storagePath = `${request.organization_id}/${request.id}.zip`;
    const { error: upErr } = await supabase.storage
      .from(EXPORT_BUCKET)
      .upload(storagePath, zip, {
        contentType: 'application/zip',
        upsert: true,
      });
    if (upErr) throw new Error(`upload failed: ${upErr.message}`);

    // 8. Sign URL
    const { data: signed, error: signErr } = await supabase.storage
      .from(EXPORT_BUCKET)
      .createSignedUrl(storagePath, SIGNED_URL_TTL_SECONDS);
    if (signErr || !signed) throw new Error(`signing failed: ${signErr?.message}`);

    const expiresAt = new Date(Date.now() + SIGNED_URL_TTL_SECONDS * 1000).toISOString();
    const summary = {
      storage_path: storagePath,
      download_url: signed.signedUrl,
      expires_at: expiresAt,
      file_count: files.length,
      files_failed: filesFailed,
      total_bytes: zip.byteLength,
    };

    await supabase
      .from('gdpr_requests')
      .update({
        status: 'fulfilled',
        fulfilled_at: new Date().toISOString(),
        fulfillment_summary: summary,
      })
      .eq('id', request.id);

    await supabase.from('recruitment_audit_events').insert({
      organization_id: request.organization_id,
      event_type: 'gdpr_export_fulfilled',
      event_category: 'export',
      subject_table: 'gdpr_requests',
      subject_id: request.id,
      applicant_id: request.applicant_id,
      actor_profile_id: request.requested_by,
      context: {
        file_count: files.length,
        files_failed: filesFailed,
        total_bytes: zip.byteLength,
      },
    });

    return json({ ok: true, summary });
  } catch (e: any) {
    const msg = e?.message ?? String(e);
    console.error('[fulfill-gdpr-export] failed', msg);
    await supabase
      .from('gdpr_requests')
      .update({ status: 'failed', error_message: msg })
      .eq('id', request.id);
    await supabase.from('recruitment_audit_events').insert({
      organization_id: request.organization_id,
      event_type: 'gdpr_export_failed',
      event_category: 'export',
      subject_table: 'gdpr_requests',
      subject_id: request.id,
      applicant_id: request.applicant_id,
      actor_profile_id: request.requested_by,
      context: { error: msg },
    });
    return json({ error: 'fulfillment_failed', message: msg }, 500);
  }
});
