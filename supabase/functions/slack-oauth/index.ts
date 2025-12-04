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

    // Handle test-credentials action
    if (action === 'test-credentials') {
      const body = await req.json();
      const { client_id, client_secret } = body;

      if (!client_id || !client_secret) {
        return new Response(
          JSON.stringify({ error: 'Client ID and Client Secret are required' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      try {
        const testResponse = await fetch('https://slack.com/api/oauth.v2.access', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: new URLSearchParams({
            client_id: client_id,
            client_secret: client_secret,
            code: 'test_invalid_code',
          }),
        });

        const testData = await testResponse.json();
        
        if (testData.error === 'invalid_code' || testData.error === 'code_already_used') {
          return new Response(
            JSON.stringify({ success: true, message: 'Credentials are valid' }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        } else if (testData.error === 'invalid_client_id') {
          return new Response(
            JSON.stringify({ error: 'Invalid Client ID' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        } else if (testData.error === 'bad_client_secret') {
          return new Response(
            JSON.stringify({ error: 'Invalid Client Secret' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        } else {
          console.log('Slack test response:', testData);
          return new Response(
            JSON.stringify({ success: true, message: 'Credentials appear valid' }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
      } catch (error) {
        console.error('Error testing credentials:', error);
        return new Response(
          JSON.stringify({ error: 'Failed to test credentials' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    // Handle direct token save (bypasses OAuth flow)
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

      return new Response(
        JSON.stringify({ 
          success: true, 
          team_name: testData.team,
          team_id: testData.team_id,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Handle OAuth callback
    if (action === 'callback') {
      const code = url.searchParams.get('code');
      const state = url.searchParams.get('state'); // Contains organization_id

      if (!code || !state) {
        return new Response(
          JSON.stringify({ error: 'Missing code or state parameter' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Fetch client credentials from database for this organization
      const { data: integrationData, error: fetchError } = await supabase
        .from('slack_integrations')
        .select('client_id, client_secret')
        .eq('organization_id', state)
        .single();

      let slackClientId = integrationData?.client_id || Deno.env.get('SLACK_CLIENT_ID');
      let slackClientSecret = integrationData?.client_secret || Deno.env.get('SLACK_CLIENT_SECRET');

      if (!slackClientId || !slackClientSecret) {
        console.error('No Slack credentials found for organization:', state);
        return new Response(
          JSON.stringify({ error: 'Slack credentials not configured' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Build redirect URI - must match exactly what was used in authorize step
      const redirectUri = `${supabaseUrl}/functions/v1/slack-oauth?action=callback`;

      // Exchange code for access token
      console.log('Exchanging code for token with redirect_uri:', redirectUri);
      const tokenResponse = await fetch('https://slack.com/api/oauth.v2.access', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          client_id: slackClientId,
          client_secret: slackClientSecret,
          code: code,
          redirect_uri: redirectUri, // Required when multiple redirect URLs are configured
        }),
      });

      const tokenData = await tokenResponse.json();
      console.log('Slack OAuth response:', JSON.stringify(tokenData, null, 2));

      if (!tokenData.ok) {
        return new Response(
          JSON.stringify({ error: tokenData.error || 'Failed to exchange code' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Store the integration in database
      const { error: upsertError } = await supabase
        .from('slack_integrations')
        .upsert({
          organization_id: state,
          is_active: true,
          access_token: tokenData.access_token,
          team_id: tokenData.team?.id,
          team_name: tokenData.team?.name,
          bot_user_id: tokenData.bot_user_id,
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

      // Redirect back to admin page with success
      // Use the app's base URL, not the Supabase function URL
      const appBaseUrl = Deno.env.get('APP_BASE_URL') || 'https://qgfaycwsangsqzpveoup.lovableproject.com';
      const redirectUrl = `${appBaseUrl}/admin/integrations?slack=connected`;
      return Response.redirect(redirectUrl, 302);
    }

    // Handle authorization request (generate OAuth URL)
    if (action === 'authorize') {
      // Verify user is authenticated
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

      // Get organization ID from request body
      const body = await req.json();
      const organizationId = body.organization_id;

      if (!organizationId) {
        return new Response(
          JSON.stringify({ error: 'Organization ID required' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Fetch client credentials from database for this organization
      const { data: integrationData } = await supabase
        .from('slack_integrations')
        .select('client_id, client_secret')
        .eq('organization_id', organizationId)
        .single();

      let slackClientId = integrationData?.client_id || Deno.env.get('SLACK_CLIENT_ID');

      if (!slackClientId) {
        return new Response(
          JSON.stringify({ error: 'Slack Client ID not configured. Please set up your Slack app credentials first.' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Build Slack OAuth URL
      const scopes = [
        'channels:read',
        'chat:write',
        'users:read',
        'groups:read',
      ].join(',');

      const redirectUri = `${supabaseUrl}/functions/v1/slack-oauth?action=callback`;
      
      const slackAuthUrl = new URL('https://slack.com/oauth/v2/authorize');
      slackAuthUrl.searchParams.set('client_id', slackClientId);
      slackAuthUrl.searchParams.set('scope', scopes);
      slackAuthUrl.searchParams.set('redirect_uri', redirectUri);
      slackAuthUrl.searchParams.set('state', organizationId);

      return new Response(
        JSON.stringify({ authorization_url: slackAuthUrl.toString() }),
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

      const body = await req.json();
      const organizationId = body.organization_id;

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
        return new Response(
          JSON.stringify({ error: 'Failed to disconnect' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      return new Response(
        JSON.stringify({ success: true }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ error: 'Invalid action' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Slack OAuth error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});