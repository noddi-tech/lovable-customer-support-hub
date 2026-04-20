/**
 * send-test-critical-alert
 *
 * Admin-only utility that fires a real critical Slack alert using a special
 * sentinel keyword ("test-trigger-please-ignore") so admins can verify the
 * 👍 / 👎 / 🔇 reaction → feedback loop end-to-end without waiting for a real
 * customer issue.
 */
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const TEST_KEYWORD = 'test-trigger-please-ignore';

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
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabase = createClient(supabaseUrl, serviceKey);
    const userId = userData.user.id;

    // Authz: must be admin in some org
    const { data: roles } = await supabase
      .from('user_roles')
      .select('organization_id, role')
      .eq('user_id', userId)
      .eq('role', 'admin');

    const body = (await req.json().catch(() => ({}))) as { organization_id?: string };
    const organizationId =
      body.organization_id ||
      (roles && roles.length > 0 ? (roles[0] as { organization_id: string }).organization_id : null);

    if (!organizationId) {
      return new Response(JSON.stringify({ error: 'No organization_id and caller is not admin' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const isAdmin = roles?.some(
      (r) => (r as { organization_id: string }).organization_id === organizationId,
    );
    if (!isAdmin) {
      return new Response(JSON.stringify({ error: 'Forbidden — admin role required' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Pick an inbox to attach to (first inbox of org)
    const { data: inbox } = await supabase
      .from('inboxes')
      .select('id, name')
      .eq('organization_id', organizationId)
      .eq('is_active', true)
      .limit(1)
      .maybeSingle();

    if (!inbox) {
      return new Response(JSON.stringify({ error: 'No active inbox for organization' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Find a recent conversation we can link the test alert to (UI deep-link target)
    const { data: convo } = await supabase
      .from('conversations')
      .select('id')
      .eq('organization_id', organizationId)
      .eq('inbox_id', inbox.id)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!convo) {
      return new Response(JSON.stringify({ error: 'No conversation in inbox to link the test alert' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Fire a real critical-flagged Slack alert. The send-slack-notification
    // function will detect the keyword and route to the critical channel.
    const subject = `🧪 TEST — verifier reaksjons-flyt (${TEST_KEYWORD})`;
    const preview = `Dette er et testvarsel sendt fra Triage-helse. React 👍 / 👎 / 🔇 for å verifisere at feedback registreres. Innholdsord: ${TEST_KEYWORD}.`;

    const { data: result, error: sendErr } = await supabase.functions.invoke(
      'send-slack-notification',
      {
        body: {
          organization_id: organizationId,
          event_type: 'new_conversation',
          conversation_id: convo.id,
          inbox_id: inbox.id,
          inbox_name: inbox.name,
          customer_name: 'Triage Test',
          customer_email: 'test@example.com',
          subject,
          preview_text: preview,
          channel: 'email',
        },
      },
    );

    if (sendErr) {
      return new Response(JSON.stringify({ error: sendErr.message }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ ok: true, sent: true, result }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (e) {
    console.error('send-test-critical-alert error:', e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : String(e) }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }
});
