/**
 * Lists Slack User Groups (subteams) for the calling org's connected
 * Slack workspace. Used by the critical-alert routing UI so admins can
 * pick a subteam to ping instead of @channel.
 *
 * Body: { organization_id: string, use_secondary?: boolean }
 * Returns: { subteams: Array<{ id, handle, name, description, user_count }> }
 */
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const body = await req.json().catch(() => ({}));
    const organization_id = typeof body.organization_id === 'string' ? body.organization_id : null;
    const use_secondary = body.use_secondary === true;
    if (!organization_id) {
      return new Response(JSON.stringify({ error: 'organization_id required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { data: integration, error: intError } = await supabase
      .from('slack_integrations')
      .select('access_token, secondary_access_token')
      .eq('organization_id', organization_id)
      .eq('is_active', true)
      .maybeSingle();

    if (intError || !integration) {
      return new Response(JSON.stringify({ error: 'No active Slack integration' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const token = use_secondary ? integration.secondary_access_token : integration.access_token;
    if (!token) {
      return new Response(JSON.stringify({ subteams: [] }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const slackResp = await fetch('https://slack.com/api/usergroups.list?include_count=true&include_disabled=false', {
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await slackResp.json();

    if (!data.ok) {
      console.warn('usergroups.list error:', data.error);
      // Common error: missing_scope (usergroups:read). Return empty list so UI degrades.
      return new Response(JSON.stringify({ subteams: [], slack_error: data.error }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const subteams = (data.usergroups || []).map((g: any) => ({
      id: g.id,
      handle: g.handle,
      name: g.name,
      description: g.description,
      user_count: g.user_count,
    }));

    return new Response(JSON.stringify({ subteams }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('slack-list-subteams error:', err);
    return new Response(JSON.stringify({ error: err instanceof Error ? err.message : String(err) }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
