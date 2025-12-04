import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Not authenticated' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Verify user
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Invalid authentication' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const body = await req.json();
    const organizationId = body.organization_id;

    if (!organizationId) {
      return new Response(
        JSON.stringify({ error: 'Organization ID required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get the Slack integration for this organization
    const { data: integration, error: integrationError } = await supabase
      .from('slack_integrations')
      .select('access_token')
      .eq('organization_id', organizationId)
      .single();

    if (integrationError || !integration?.access_token) {
      return new Response(
        JSON.stringify({ error: 'Slack not connected', channels: [] }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Fetch channels from Slack
    const channels: Array<{ id: string; name: string; is_private: boolean }> = [];
    let cursor: string | undefined;

    do {
      const params = new URLSearchParams({
        types: 'public_channel,private_channel',
        exclude_archived: 'true',
        limit: '200',
      });
      if (cursor) params.set('cursor', cursor);

      const response = await fetch(`https://slack.com/api/conversations.list?${params}`, {
        headers: {
          'Authorization': `Bearer ${integration.access_token}`,
        },
      });

      const data = await response.json();

      if (!data.ok) {
        console.error('Slack API error:', data.error);
        return new Response(
          JSON.stringify({ error: data.error, channels: [] }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      for (const channel of data.channels || []) {
        channels.push({
          id: channel.id,
          name: channel.name,
          is_private: channel.is_private,
        });
      }

      cursor = data.response_metadata?.next_cursor;
    } while (cursor);

    // Sort channels alphabetically
    channels.sort((a, b) => a.name.localeCompare(b.name));

    return new Response(
      JSON.stringify({ channels }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error listing Slack channels:', error);
    return new Response(
      JSON.stringify({ error: error.message, channels: [] }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
