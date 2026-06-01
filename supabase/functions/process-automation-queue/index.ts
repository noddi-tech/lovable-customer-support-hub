import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient, type SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";
import { createCandidateFormToken } from "../_shared/sendCandidateForm.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

interface ActionResult {
  success: boolean;
  error?: string;
  duration_ms: number;
  http_status?: number;
  response_excerpt?: string;
  preview?: string;
}

interface ClaimResult {
  claimed: boolean;
  reason?: string;
  queue_id?: string;
  execution_id?: string;
  rule_id?: string | null;
  rule_snapshot?: {
    id: string;
    name: string;
    action_type: string;
    action_config: Record<string, unknown>;
    [k: string]: unknown;
  };
  trigger_context?: Record<string, unknown>;
  actor_profile_id?: string;
  organization_id?: string;
}

// =============================================================================
// send_email — render template server-side, POST to send-email edge function
// =============================================================================
async function dispatchSendEmail(
  supabase: SupabaseClient,
  actionConfig: Record<string, unknown>,
  triggerContext: Record<string, unknown>,
): Promise<ActionResult> {
  const start = performance.now();

  const templateId = actionConfig.template_id as string | undefined;
  const applicationId = triggerContext.application_id as string | undefined;

  if (!templateId) {
    return { success: false, error: "send_email requires template_id in action_config", duration_ms: 0 };
  }
  if (!applicationId) {
    return { success: false, error: "send_email requires application_id in trigger_context", duration_ms: 0 };
  }

  // Render template via RPC (fast, no external HTTP)
  const { data: rendered, error: renderErr } = await supabase.rpc("render_email_template", {
    p_template_id: templateId,
    p_application_id: applicationId,
  });

  if (renderErr || !rendered || !Array.isArray(rendered) || rendered.length === 0) {
    return {
      success: false,
      error: `render_email_template failed: ${renderErr?.message ?? "no row returned"}`,
      duration_ms: Math.round(performance.now() - start),
    };
  }

  const row = rendered[0] as { rendered_subject: string; rendered_html: string };

  // Resolve recipient email via joined select
  const { data: appData, error: appErr } = await supabase
    .from("applications")
    .select("applicant_id, applicants(email)")
    .eq("id", applicationId)
    .single();

  const recipient = (appData as { applicants?: { email?: string } | null } | null)?.applicants?.email;
  if (appErr || !recipient) {
    return {
      success: false,
      error: `Recipient email lookup failed: ${appErr?.message ?? "no email on applicant"}`,
      duration_ms: Math.round(performance.now() - start),
    };
  }

  // Call send-email edge function (real async fetch, no Postgres statement timeout)
  const resp = await fetch(`${SUPABASE_URL}/functions/v1/send-email`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      to: recipient,
      subject: row.rendered_subject,
      html: row.rendered_html,
    }),
  });

  const bodyText = await resp.text();
  const durationMs = Math.round(performance.now() - start);

  return {
    success: resp.ok,
    http_status: resp.status,
    response_excerpt: bodyText.slice(0, 2048),
    error: resp.ok ? undefined : `send-email returned HTTP ${resp.status}`,
    duration_ms: durationMs,
  };
}

// =============================================================================
// assign_to — UPDATE applications.assigned_to
// =============================================================================
async function dispatchAssignTo(
  supabase: SupabaseClient,
  actionConfig: Record<string, unknown>,
  triggerContext: Record<string, unknown>,
): Promise<ActionResult> {
  const start = performance.now();
  const userId = actionConfig.user_id as string | undefined;
  const applicationId = triggerContext.application_id as string | undefined;

  if (!userId) return { success: false, error: "assign_to requires user_id in action_config", duration_ms: 0 };
  if (!applicationId) return { success: false, error: "assign_to requires application_id", duration_ms: 0 };

  const { error } = await supabase
    .from("applications")
    .update({ assigned_to: userId })
    .eq("id", applicationId);

  return {
    success: !error,
    error: error?.message,
    duration_ms: Math.round(performance.now() - start),
  };
}

// =============================================================================
// webhook — POST to dispatch-webhook edge function which handles the user URL
// =============================================================================
async function dispatchWebhook(
  actionConfig: Record<string, unknown>,
  triggerContext: Record<string, unknown>,
  ruleSnapshot: { id: string; name: string; [k: string]: unknown },
): Promise<ActionResult> {
  const start = performance.now();

  const url = actionConfig.url as string | undefined;
  if (!url) return { success: false, error: "webhook requires url in action_config", duration_ms: 0 };

  const resp = await fetch(`${SUPABASE_URL}/functions/v1/dispatch-webhook`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      url,
      headers: (actionConfig.headers as Record<string, string> | undefined) ?? null,
      body: {
        version: "1",
        event: {
          trigger_type: (triggerContext.trigger_type as string | undefined) ?? "unknown",
          occurred_at: new Date().toISOString(),
        },
        rule: { id: ruleSnapshot.id, name: ruleSnapshot.name },
        context: triggerContext,
      },
      message_template: (actionConfig.message_template as string | undefined) ?? null,
    }),
  });

  const bodyText = await resp.text();
  const durationMs = Math.round(performance.now() - start);

  // Parse dispatch-webhook's inner JSON response — that contains the
  // actual target HTTP status + success/error. Wrapper resp.status is
  // always 200 unless dispatcher itself crashed.
  let inner: {
    success?: boolean;
    http_status?: number | null;
    response_excerpt?: string;
    error?: string | null;
  } = {};
  try {
    inner = JSON.parse(bodyText);
  } catch {
    inner = {
      success: false,
      error: `Invalid JSON from dispatch-webhook: ${bodyText.slice(0, 200)}`,
    };
  }

  return {
    success: inner.success ?? false,
    http_status: inner.http_status ?? null,
    response_excerpt: inner.response_excerpt ?? bodyText.slice(0, 2048),
    error: inner.error ?? (inner.success ? undefined : `dispatch-webhook returned no success`),
    duration_ms: durationMs,
  };
}

// =============================================================================
// send_candidate_form — issue a candidate-form token + send invite email
// (email-only in v1; SMS via automation deferred until system-callable SMS)
// =============================================================================
async function dispatchSendCandidateForm(
  supabase: SupabaseClient,
  actionConfig: Record<string, unknown>,
  triggerContext: Record<string, unknown>,
  ruleSnapshot: { id: string; name: string; [k: string]: unknown },
): Promise<ActionResult> {
  const start = performance.now();

  const channel = (actionConfig.channel as string | undefined) ?? "email";
  if (channel !== "email") {
    return {
      success: false,
      error: "send_candidate_form: only channel='email' is supported in v1 automation",
      duration_ms: Math.round(performance.now() - start),
    };
  }
  const applicationId = triggerContext.application_id as string | undefined;
  if (!applicationId) {
    return {
      success: false,
      error: "send_candidate_form requires application_id",
      duration_ms: Math.round(performance.now() - start),
    };
  }
  const expiryDays = Math.max(1, Math.min(14, Number(actionConfig.expiry_days ?? 7)));

  // 1. Create token (system actor = null)
  const created = await createCandidateFormToken(supabase, {
    application_id: applicationId,
    channel: "email",
    expiry_days: expiryDays,
    created_by_profile_id: null,
  });
  if (!created.ok) {
    return {
      success: false,
      error: `token: ${created.error}${created.message ? ` — ${created.message}` : ""}`,
      duration_ms: Math.round(performance.now() - start),
    };
  }

  // 2. Tag the audit row with the rule name so history shows attribution
  await supabase
    .from("recruitment_audit_events")
    .update({
      context: {
        triggered_by_rule_id: ruleSnapshot.id,
        triggered_by_rule_name: ruleSnapshot.name,
        channel: "email",
        expires_at: created.expires_at,
      },
    })
    .eq("event_type", "candidate_form_sent")
    .eq("subject_id", created.token_id);

  // 3. Resolve recipient
  if (!created.applicant.email) {
    return {
      success: false,
      error: "Applicant has no email address",
      duration_ms: Math.round(performance.now() - start),
    };
  }

  // 4. Build email + send via send-email (service role)
  const firstName = created.applicant.first_name ?? "";
  const expiresHuman = new Date(created.expires_at).toLocaleDateString("nb-NO");
  const subject = `Vi trenger litt mer info – ${created.position.title}`;
  const html = `
    <p>Hei ${firstName},</p>
    <p>Vi trenger litt mer info for søknaden din til <strong>${created.position.title}</strong>.</p>
    <p>Vennligst fyll ut skjemaet innen ${expiresHuman}:</p>
    <p><a href="${created.url}" style="display:inline-block;padding:12px 20px;background:#2563eb;color:#fff;text-decoration:none;border-radius:6px;">Åpne skjema</a></p>
    <p>Eller åpne lenken direkte:<br><a href="${created.url}">${created.url}</a></p>
    <p>Du vil bli bedt om å bekrefte de siste 4 sifrene i telefonnummeret ditt.</p>
  `;
  const resp = await fetch(`${SUPABASE_URL}/functions/v1/send-email`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ to: created.applicant.email, subject, html }),
  });
  const text = await resp.text();
  const duration_ms = Math.round(performance.now() - start);

  if (!resp.ok) {
    // Auto-revoke on dispatch failure
    await supabase
      .from("candidate_form_tokens")
      .update({ revoked_at: new Date().toISOString() })
      .eq("id", created.token_id)
      .is("revoked_at", null)
      .is("used_at", null);
    return {
      success: false,
      http_status: resp.status,
      response_excerpt: text.slice(0, 2048),
      error: `send-email returned HTTP ${resp.status}`,
      duration_ms,
    };
  }

  return {
    success: true,
    http_status: resp.status,
    response_excerpt: text.slice(0, 2048),
    preview: `Sendte skjema-lenke til ${created.applicant.email} (utløper ${expiresHuman})`,
    duration_ms,
  };
}

// =============================================================================
// Single-action dispatch switch
// =============================================================================
async function dispatch(
  supabase: SupabaseClient,
  actionType: string,
  actionConfig: Record<string, unknown>,
  triggerContext: Record<string, unknown>,
  ruleSnapshot: { id: string; name: string; [k: string]: unknown },
): Promise<ActionResult> {
  switch (actionType) {
    case "send_email":
      return dispatchSendEmail(supabase, actionConfig, triggerContext);
    case "assign_to":
      return dispatchAssignTo(supabase, actionConfig, triggerContext);
    case "webhook":
      return dispatchWebhook(actionConfig, triggerContext, ruleSnapshot);
    case "send_candidate_form":
      return dispatchSendCandidateForm(supabase, actionConfig, triggerContext, ruleSnapshot);
    case "send_sms":
      return { success: false, error: "send_sms is not implemented in v1", duration_ms: 0 };
    case "create_task":
      return { success: false, error: "create_task is not implemented in v1", duration_ms: 0 };
    default:
      return { success: false, error: `Unknown action_type: ${actionType}`, duration_ms: 0 };
  }
}

// =============================================================================
// Handler: claim → dispatch (Deno) → finalize
// =============================================================================
const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const startedAt = performance.now();

  try {
    if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
      console.error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
      return json({ error: "Worker not configured" }, 500);
    }

    const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const payload = (await req.json()) as { queue_id?: string };
    const queueId = payload?.queue_id;
    if (!queueId || typeof queueId !== "string") {
      return json({ error: "Missing queue_id in body" }, 400);
    }

    console.log(`[claim] attempting queue_id=${queueId}`);

    const { data: claimData, error: claimErr } = await supabase.rpc("claim_queue_row", {
      p_queue_id: queueId,
    });

    if (claimErr) {
      console.error(`[claim] rpc error for queue_id=${queueId}:`, claimErr);
      return json(
        { ok: false, queue_id: queueId, error: claimErr.message, duration_ms: elapsed(startedAt) },
        200,
      );
    }

    const claim = claimData as ClaimResult;
    if (!claim?.claimed) {
      console.log(`[claim] not claimed queue_id=${queueId} reason="${claim?.reason ?? "unknown"}"`);
      return json(
        { ok: true, claimed: false, queue_id: queueId, reason: claim?.reason ?? "unknown", duration_ms: elapsed(startedAt) },
        200,
      );
    }

    const rule = claim.rule_snapshot!;
    const actionType = String(rule.action_type);
    console.log(`[dispatch] queue_id=${queueId} execution_id=${claim.execution_id} action_type=${actionType}`);

    const result = await dispatch(
      supabase,
      actionType,
      rule.action_config ?? {},
      claim.trigger_context ?? {},
      rule,
    );

    const finalStatus: "success" | "failed" = result.success ? "success" : "failed";
    console.log(
      `[finalize] queue_id=${queueId} status=${finalStatus} duration=${result.duration_ms}ms` +
        (result.http_status ? ` http=${result.http_status}` : "") +
        (result.error ? ` error="${result.error}"` : ""),
    );

    // Wrap result in array with action_type — matches dry-run shape
    // and is forward-compatible with rules having multiple actions.
    const actionResults = [{
      action_type: actionType,
      ...result,
    }];

    const { error: finalizeErr } = await supabase.rpc("finalize_queue_row", {
      p_queue_id: queueId,
      p_execution_id: claim.execution_id,
      p_action_results: actionResults,
      p_duration_ms: result.duration_ms,
      p_final_status: finalStatus,
    });

    if (finalizeErr) {
      console.error(`[finalize] rpc error queue_id=${queueId}:`, finalizeErr);
      return json(
        { ok: false, queue_id: queueId, error: finalizeErr.message, duration_ms: elapsed(startedAt) },
        200,
      );
    }

    return json(
      {
        ok: true,
        claimed: true,
        queue_id: queueId,
        execution_id: claim.execution_id,
        status: finalStatus,
        dispatch_duration_ms: result.duration_ms,
        total_duration_ms: elapsed(startedAt),
      },
      200,
    );
  } catch (err: unknown) {
    const e = err as Error;
    console.error("process-automation-queue unhandled error:", e);
    return json({ ok: false, error: e?.message ?? "Unknown error", duration_ms: elapsed(startedAt) }, 200);
  }
};

function json(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function elapsed(started: number): number {
  return Math.round(performance.now() - started);
}

serve(handler);
