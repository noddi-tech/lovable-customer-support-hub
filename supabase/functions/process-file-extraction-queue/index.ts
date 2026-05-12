import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.53.0';
import { extractText } from '../_shared/fileTextExtraction.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const BATCH_SIZE = 5;
const MAX_ATTEMPTS = 3;

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
  const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  const results = { processed: 0, succeeded: 0, failed: 0 };

  try {
    const { data: rows } = await admin
      .from('applicant_files')
      .select('id, file_name, storage_path, extraction_attempts')
      .eq('extraction_status', 'pending')
      .lt('extraction_attempts', MAX_ATTEMPTS)
      .order('created_at', { ascending: true })
      .limit(BATCH_SIZE);

    for (const row of rows || []) {
      results.processed++;
      try {
        // Download from storage
        const { data: blob, error: dlErr } = await admin.storage
          .from('applicant-files')
          .download(row.storage_path);
        if (dlErr || !blob) throw dlErr || new Error('No blob');
        const bytes = new Uint8Array(await blob.arrayBuffer());

        const result = await extractText(row.file_name, bytes);

        if ('error' in result) {
          // Unsupported type → mark skipped, not failed
          await admin
            .from('applicant_files')
            .update({ extraction_status: 'skipped', extraction_error: result.error })
            .eq('id', row.id);
          continue;
        }

        await admin
          .from('applicant_files')
          .update({
            extracted_text: result.text,
            extracted_at: new Date().toISOString(),
            extraction_status: 'done',
            extraction_error: null,
          })
          .eq('id', row.id);
        results.succeeded++;
      } catch (err: any) {
        results.failed++;
        const attempts = (row.extraction_attempts || 0) + 1;
        const finalFail = attempts >= MAX_ATTEMPTS;
        await admin
          .from('applicant_files')
          .update({
            extraction_attempts: attempts,
            extraction_status: finalFail ? 'failed' : 'pending',
            extraction_error: String(err?.message || err).slice(0, 500),
          })
          .eq('id', row.id);
      }
    }

    return new Response(JSON.stringify(results), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err: any) {
    console.error('[process-file-extraction-queue] fatal', err);
    return new Response(JSON.stringify({ error: err?.message || 'Internal error', ...results }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
