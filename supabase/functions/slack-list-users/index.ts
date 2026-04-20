/**
 * Lists Slack workspace members (humans only, deduped) for the calling
 * org's connected Slack workspace. Used by the critical-alert routing UI
 * so admins can pick a single triage owner to ping.
 *
 * Body: { organization_id: string, use_secondary?: boolean }
 * Returns: { users: Array<{ id, name, real_name, display_name, email }> }
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

    const { data: integration } = await supabase
      .from('slack_integrations')
      .select('access_token, secondary_access_token')
      .eq('organization_id', organization_id)
      .eq('is_active', true)
      .maybeSingle();

    if (!integration) {
      return new Response(JSON.stringify({ error: 'No active Slack integration' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const token = use_secondary ? integration.secondary_access_token : integration.access_token;
    if (!token) {
      return new Response(JSON.stringify({ users: [] }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const allUsers: any[] = [];
    let cursor = '';
    // Paginate users.list (workspace can have hundreds of members)
    do {
      const url = `https://slack.com/api/users.list?limit=200${cursor ? `&cursor=${encodeURIComponent(cursor)}` : ''}`;
      const resp = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
      const data = await resp.json();
      if (!data.ok) {
        console.warn('users.list error:', data.error);
        return new Response(JSON.stringify({ users: [], slack_error: data.error }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      allUsers.push(...(data.members || []));
      cursor = data.response_metadata?.next_cursor || '';
    } while (cursor);

    const users = allUsers
      .filter((u) => !u.deleted && !u.is_bot && u.id !== 'USLACKBOT')
      .map((u) => ({
        id: u.id,
        name: u.name,
        real_name: u.real_name,
        display_name: u.profile?.display_name || u.profile?.real_name,
        email: u.profile?.email,
      }))
      .sort((a, b) => (a.display_name || a.name).localeCompare(b.display_name || b.name));

    return new Response(JSON.stringify({ users }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('slack-list-users error:', err);
    return new Response(JSON.stringify({ error: err instanceof Error ? err.message : String(err) }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
