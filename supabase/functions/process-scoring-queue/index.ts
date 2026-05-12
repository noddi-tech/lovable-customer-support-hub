import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.53.0';
import { scoreApplicant, type ScoringRubric, type ScoringInput } from '../_shared/llmScoring.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const BATCH_SIZE = 5;
const MAX_ATTEMPTS = 3;
const BACKOFF_MINUTES = [1, 5, 15];

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
  const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  const results = { processed: 0, succeeded: 0, failed: 0, errors: [] as string[] };

  try {
    // Atomic claim using a CTE
    const { data: claimed, error: claimErr } = await admin.rpc('claim_scoring_queue_batch', {
      p_batch_size: BATCH_SIZE,
    });

    if (claimErr) {
      // Fallback if RPC doesn't exist yet — do a non-atomic claim
      console.warn('[process-scoring-queue] claim RPC missing, using fallback:', claimErr.message);
      const { data: rows } = await admin
        .from('application_scoring_queue')
        .select('id')
        .eq('status', 'pending')
        .or(`next_attempt_at.is.null,next_attempt_at.lte.${new Date().toISOString()}`)
        .order('created_at', { ascending: true })
        .limit(BATCH_SIZE);
      const ids = (rows || []).map((r: any) => r.id);
      if (ids.length === 0) {
        return new Response(JSON.stringify(results), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }
      await admin.from('application_scoring_queue').update({ status: 'processing' }).in('id', ids);
      for (const id of ids) {
        await processOne(admin, id, results);
      }
      return new Response(JSON.stringify(results), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const queueIds = (claimed as any[])?.map((r) => r.id) ?? [];
    for (const id of queueIds) {
      await processOne(admin, id, results);
    }

    return new Response(JSON.stringify(results), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err: any) {
    console.error('[process-scoring-queue] fatal', err);
    return new Response(JSON.stringify({ error: err?.message || 'Internal error', ...results }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

async function processOne(admin: any, queueId: string, results: any) {
  results.processed++;
  let queueRow: any;
  try {
    const { data } = await admin.from('application_scoring_queue').select('*').eq('id', queueId).single();
    queueRow = data;
    if (!queueRow) return;

    // Load application + position + applicant
    const { data: app } = await admin
      .from('applications')
      .select('id, organization_id, applicant_id, position_id, current_stage_id')
      .eq('id', queueRow.application_id)
      .single();
    if (!app) throw new Error('Application gone');

    const { data: position } = await admin
      .from('job_positions')
      .select('id, title, description, scoring_enabled, scoring_rubric, scoring_global_baseline_id, pipeline_id')
      .eq('id', app.position_id)
      .single();
    if (!position) throw new Error('Position not found');

    if (!position.scoring_enabled) {
      await admin.from('applications').update({ score_status: 'disabled' }).eq('id', app.id);
      await markDone(admin, queueId);
      return;
    }

    // Resolve effective rubric: position rubric > baseline > none
    let rubric: ScoringRubric | null = position.scoring_rubric as ScoringRubric | null;
    if (!rubric && position.scoring_global_baseline_id) {
      const { data: baseline } = await admin
        .from('org_scoring_baselines')
        .select('rubric')
        .eq('id', position.scoring_global_baseline_id)
        .maybeSingle();
      rubric = (baseline?.rubric as ScoringRubric) || null;
    }
    if (!rubric) {
      // No rubric set; fall back to the org default if one exists
      const { data: defaultBaseline } = await admin
        .from('org_scoring_baselines')
        .select('rubric')
        .eq('organization_id', app.organization_id)
        .eq('is_default', true)
        .is('soft_deleted_at', null)
        .maybeSingle();
      rubric = (defaultBaseline?.rubric as ScoringRubric) || null;
    }
    if (!rubric || !rubric.criteria?.length) {
      await admin.from('applications').update({ score_status: 'disabled' }).eq('id', app.id);
      await markDone(admin, queueId);
      return;
    }

    // Load applicant
    const { data: applicant } = await admin
      .from('applicants')
      .select('first_name,last_name,email,phone,location,years_experience,certifications,drivers_license_classes,language_norwegian,work_permit_status,availability_date')
      .eq('id', app.applicant_id)
      .single();
    if (!applicant) throw new Error('Applicant not found');

    // Load custom field values + field defs
    const { data: fieldValues } = await admin
      .from('recruitment_applicant_field_values')
      .select('value, raw_value, field_id, recruitment_custom_fields!inner(display_name, type_id, recruitment_custom_field_types(key))')
      .eq('applicant_id', app.applicant_id);

    const customFieldValues = (fieldValues || []).map((v: any) => ({
      field_name: v.recruitment_custom_fields?.display_name || 'unknown',
      field_type: v.recruitment_custom_fields?.recruitment_custom_field_types?.key || 'text',
      value: v.value ?? v.raw_value,
    }));

    // Load extracted text from files
    const { data: files } = await admin
      .from('applicant_files')
      .select('file_name, extracted_text, extraction_status')
      .eq('applicant_id', app.applicant_id)
      .eq('extraction_status', 'done')
      .not('extracted_text', 'is', null);

    const filesInput = (files || []).map((f: any) => ({
      filename: f.file_name,
      extracted_text: f.extracted_text,
    }));

    // Resolve current stage name from pipeline
    let stageInfo: { name: string; description?: string | null } | null = null;
    const { data: pipeline } = await admin
      .from('recruitment_pipelines')
      .select('stages')
      .eq('id', position.pipeline_id)
      .maybeSingle();
    const stage = (pipeline?.stages as any[])?.find((s) => s.id === app.current_stage_id);
    if (stage) stageInfo = { name: stage.name, description: stage.description };

    const input: ScoringInput = {
      applicant: applicant as any,
      position: { title: position.title, description: position.description },
      custom_field_values: customFieldValues,
      files: filesInput,
      rubric,
      stage: stageInfo,
    };

    const result = await scoreApplicant(input);

    // Persist on application
    await admin
      .from('applications')
      .update({
        score: result.overall_score,
        score_breakdown: result.per_criterion,
        score_explanation: result.explanation,
        score_strengths: result.strengths,
        score_concerns: result.concerns,
        score_updated_at: new Date().toISOString(),
        score_stage_id: app.current_stage_id,
        score_model: result.model,
        score_status: 'scored',
      })
      .eq('id', app.id);

    // Insert immutable history row
    await admin.from('applicant_score_history').insert({
      application_id: app.id,
      organization_id: app.organization_id,
      score: result.overall_score,
      explanation: result.explanation,
      strengths: result.strengths,
      concerns: result.concerns,
      per_criterion: result.per_criterion,
      stage_id: app.current_stage_id,
      model: result.model,
      trigger_reason: queueRow.trigger_reason,
      triggered_by: queueRow.triggered_by,
      input_snapshot: { custom_field_count: customFieldValues.length, file_count: filesInput.length },
      token_usage: result.token_usage,
    });

    // Audit
    await admin.from('recruitment_audit_events').insert({
      organization_id: app.organization_id,
      event_type: 'application_scored',
      event_category: 'write',
      subject_table: 'applications',
      subject_id: app.id,
      applicant_id: app.applicant_id,
      actor_profile_id: queueRow.triggered_by,
      new_values: { score: result.overall_score, model: result.model },
      context: { trigger_reason: queueRow.trigger_reason, token_usage: result.token_usage },
    });

    await markDone(admin, queueId);
    results.succeeded++;
  } catch (err: any) {
    console.error('[process-scoring-queue] item error', queueId, err);
    results.failed++;
    results.errors.push(`${queueId}: ${err?.message}`);
    const attempts = (queueRow?.attempts ?? 0) + 1;
    const willRetry = attempts < MAX_ATTEMPTS;
    const nextAttemptAt = willRetry
      ? new Date(Date.now() + BACKOFF_MINUTES[attempts - 1] * 60_000).toISOString()
      : null;
    await admin
      .from('application_scoring_queue')
      .update({
        status: willRetry ? 'pending' : 'failed',
        attempts,
        next_attempt_at: nextAttemptAt,
        error_message: String(err?.message || err).slice(0, 1000),
      })
      .eq('id', queueId);
    if (!willRetry && queueRow?.application_id) {
      await admin
        .from('applications')
        .update({ score_status: 'failed' })
        .eq('id', queueRow.application_id);
      await admin.from('recruitment_audit_events').insert({
        organization_id: queueRow.organization_id,
        event_type: 'application_score_failed',
        event_category: 'write',
        subject_table: 'applications',
        subject_id: queueRow.application_id,
        new_values: { error: String(err?.message || err).slice(0, 500) },
      });
    }
  }
}

async function markDone(admin: any, queueId: string) {
  await admin.from('application_scoring_queue').update({ status: 'done' }).eq('id', queueId);
}
