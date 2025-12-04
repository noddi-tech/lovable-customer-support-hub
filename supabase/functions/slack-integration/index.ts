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
    const url = new URL(req.url);
    const action = url.searchParams.get('action');

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Handle save-token action (main connection method)
    if (action === 'save-token') {
      const authHeader = req.headers.get('Authorization');
      if (!authHeader) {
        return new Response(
          JSON.stringify({ error: 'Not authenticated' }),
          { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const token = authHeader.replace('Bearer ', '');
      const { data: { user }, error: authError } = await supabase.auth.getUser(token);

      if (authError || !user) {
        return new Response(
          JSON.stringify({ error: 'Invalid authentication' }),
          { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const body = await req.json();
      const { bot_token, organization_id } = body;

      if (!bot_token || !organization_id) {
        return new Response(
          JSON.stringify({ error: 'Bot token and organization ID are required' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Validate token format
      if (!bot_token.startsWith('xoxb-')) {
        return new Response(
          JSON.stringify({ error: 'Invalid token format. Bot tokens should start with xoxb-' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Validate token with Slack API
      console.log('Testing bot token with auth.test...');
      const testResponse = await fetch('https://slack.com/api/auth.test', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${bot_token}`,
          'Content-Type': 'application/json',
        },
      });

      const testData = await testResponse.json();
      console.log('Slack auth.test response:', JSON.stringify(testData, null, 2));

      if (!testData.ok) {
        return new Response(
          JSON.stringify({ error: `Invalid token: ${testData.error}` }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Save to database
      const { error: upsertError } = await supabase
        .from('slack_integrations')
        .upsert({
          organization_id: organization_id,
          is_active: true,
          access_token: bot_token,
          team_id: testData.team_id,
          team_name: testData.team,
          bot_user_id: testData.user_id,
          setup_completed: true,
        }, {
          onConflict: 'organization_id',
        });

      if (upsertError) {
        console.error('Error saving Slack integration:', upsertError);
        return new Response(
          JSON.stringify({ error: 'Failed to save integration' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      console.log(`Slack integration saved for org ${organization_id} - team: ${testData.team}`);

      return new Response(
        JSON.stringify({ 
          success: true, 
          team_name: testData.team,
          team_id: testData.team_id,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Handle disconnect
    if (action === 'disconnect') {
      const authHeader = req.headers.get('Authorization');
      if (!authHeader) {
        return new Response(
          JSON.stringify({ error: 'Not authenticated' }),
          { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

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

      const { error } = await supabase
        .from('slack_integrations')
        .update({
          is_active: false,
          access_token: null,
          team_id: null,
          team_name: null,
          bot_user_id: null,
          setup_completed: false,
        })
        .eq('organization_id', organizationId);

      if (error) {
        console.error('Error disconnecting Slack:', error);
        return new Response(
          JSON.stringify({ error: 'Failed to disconnect' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      console.log(`Slack disconnected for org ${organizationId}`);

      return new Response(
        JSON.stringify({ success: true }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ error: 'Invalid action. Valid actions: save-token, disconnect' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Slack integration error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
