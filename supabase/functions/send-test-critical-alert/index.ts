/**
 * send-test-critical-alert
 *
 * Admin-only utility that fires a real critical Slack alert using a special
 * sentinel keyword ("test-trigger-please-ignore") so admins can verify the
 * 👍 / 👎 / 🔇 reaction → feedback loop end-to-end without waiting for a real
 * customer issue.
 *
 * Always returns HTTP 200 with `{ ok, error?, error_stage?, ... }` so the
 * client can surface the real failure reason (supabase.functions.invoke
 * swallows non-2xx response bodies).
 */
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const TEST_KEYWORD = 'test-trigger-please-ignore';

type Stage =
  | 'auth'
  | 'authz'
  | 'no_inbox'
  | 'no_conversation'
  | 'slack_invoke'
  | 'slack_response'
  | 'unexpected';

function respond(ok: boolean, payload: Record<string, unknown> = {}, status = 200) {
  return new Response(JSON.stringify({ ok, ...payload }), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!;

    // Authn: extract caller from JWT
    const authHeader = req.headers.get('Authorization') ?? '';
    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData, error: userErr } = await userClient.auth.getUser();
    if (userErr || !userData?.user) {
      console.error('[test-alert] auth failed', userErr);
      return respond(false, {
        error: userErr?.message || 'Unauthorized',
        error_stage: 'auth' as Stage,
      });
    }

    const supabase = createClient(supabaseUrl, serviceKey);
    const userId = userData.user.id;

    // Authz: must be admin or super_admin
    const { data: roles, error: rolesErr } = await supabase
      .from('user_roles')
      .select('organization_id, role')
      .eq('user_id', userId);

    if (rolesErr) {
      console.error('[test-alert] role lookup failed', rolesErr);
      return respond(false, { error: rolesErr.message, error_stage: 'authz' as Stage });
    }

    const adminRoles = (roles ?? []).filter(
      (r) => (r as { role: string }).role === 'admin' || (r as { role: string }).role === 'super_admin',
    );

    const body = (await req.json().catch(() => ({}))) as { organization_id?: string };
    const organizationId =
      body.organization_id ||
      (adminRoles.length > 0
        ? (adminRoles[0] as { organization_id: string }).organization_id
        : null);

    if (!organizationId) {
      console.error('[test-alert] no org and not admin', { userId });
      return respond(false, {
        error: 'Ingen organisasjon funnet. Du må være admin/super_admin.',
        error_stage: 'authz' as Stage,
      });
    }

    const isAuthorized =
      adminRoles.some((r) => (r as { role: string }).role === 'super_admin') ||
      adminRoles.some(
        (r) => (r as { organization_id: string }).organization_id === organizationId,
      );
    if (!isAuthorized) {
      console.error('[test-alert] forbidden', { userId, organizationId });
      return respond(false, {
        error: 'Forbidden — admin role required for this organization',
        error_stage: 'authz' as Stage,
      });
    }

    // Pick an inbox to attach to (first inbox of org)
    const { data: inbox, error: inboxErr } = await supabase
      .from('inboxes')
      .select('id, name')
      .eq('organization_id', organizationId)
      .eq('is_active', true)
      .limit(1)
      .maybeSingle();

    if (inboxErr) {
      console.error('[test-alert] inbox lookup failed', inboxErr);
      return respond(false, { error: inboxErr.message, error_stage: 'no_inbox' as Stage });
    }
    if (!inbox) {
      return respond(false, {
        error: 'Ingen aktiv innboks funnet for organisasjonen.',
        error_stage: 'no_inbox' as Stage,
      });
    }

    // Find a recent conversation. First try the chosen inbox; if empty,
    // fall back to any conversation in the org.
    let convoId: string | null = null;

    const { data: convoInbox } = await supabase
      .from('conversations')
      .select('id')
      .eq('organization_id', organizationId)
      .eq('inbox_id', inbox.id)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (convoInbox?.id) {
      convoId = convoInbox.id;
    } else {
      const { data: convoAny } = await supabase
        .from('conversations')
        .select('id')
        .eq('organization_id', organizationId)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      convoId = convoAny?.id ?? null;
    }

    if (!convoId) {
      return respond(false, {
        error: 'Ingen samtale i organisasjonen å koble testvarselet til.',
        error_stage: 'no_conversation' as Stage,
      });
    }

    // Fire a real critical-flagged Slack alert.
    const subject = `🧪 TEST — verifiser reaksjons-flyt (${TEST_KEYWORD})`;
    const preview = `Dette er et testvarsel sendt fra Triage-helse. React 👍 / 👎 / 🔇 for å verifisere at feedback registreres. Innholdsord: ${TEST_KEYWORD}.`;

    const { data: slackResult, error: sendErr } = await supabase.functions.invoke(
      'send-slack-notification',
      {
        body: {
          organization_id: organizationId,
          event_type: 'new_conversation',
          conversation_id: convoId,
          inbox_id: inbox.id,
          inbox_name: inbox.name,
          customer_name: 'Triage Test',
          customer_email: 'test@example.com',
          subject,
          preview_text: preview,
          channel: 'email',
          force_critical: true,
        },
      },
    );

    if (sendErr) {
      console.error('[test-alert] slack invoke error', sendErr);
      return respond(false, {
        error: `slack_invoke: ${sendErr.message || String(sendErr)}`,
        error_stage: 'slack_invoke' as Stage,
      });
    }

    // send-slack-notification can resolve with a body-level error
    const sr = (slackResult ?? {}) as { success?: boolean; error?: string; skipped?: boolean; reason?: string };
    if (sr.success === false || sr.error) {
      console.error('[test-alert] slack response error', sr);
      return respond(false, {
        error: `slack_response: ${sr.error || sr.reason || 'unknown'}`,
        error_stage: 'slack_response' as Stage,
        slack_result: sr,
      });
    }

    if (sr.skipped) {
      return respond(false, {
        error: `slack_response: hoppet over (${sr.reason || 'ukjent'})`,
        error_stage: 'slack_response' as Stage,
        slack_result: sr,
      });
    }

    return respond(true, { sent: true, conversation_id: convoId, slack_result: sr });
  } catch (e) {
    console.error('[test-alert] unexpected error:', e);
    return respond(false, {
      error: e instanceof Error ? e.message : String(e),
      error_stage: 'unexpected' as Stage,
    });
  }
});
