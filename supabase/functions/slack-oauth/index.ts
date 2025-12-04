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
    const slackClientId = Deno.env.get('SLACK_CLIENT_ID');
    const slackClientSecret = Deno.env.get('SLACK_CLIENT_SECRET');

    if (!slackClientId || !slackClientSecret) {
      return new Response(
        JSON.stringify({ error: 'Slack credentials not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
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

      // Exchange code for access token
      const tokenResponse = await fetch('https://slack.com/api/oauth.v2.access', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          client_id: slackClientId,
          client_secret: slackClientSecret,
          code: code,
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
      const supabase = createClient(supabaseUrl, supabaseServiceKey);

      const { error: upsertError } = await supabase
        .from('slack_integrations')
        .upsert({
          organization_id: state,
          is_active: true,
          access_token: tokenData.access_token,
          team_id: tokenData.team?.id,
          team_name: tokenData.team?.name,
          bot_user_id: tokenData.bot_user_id,
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
      const redirectUrl = `${url.origin}/admin/integrations?slack=connected`;
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

      const supabase = createClient(supabaseUrl, supabaseServiceKey);
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

      const supabase = createClient(supabaseUrl, supabaseServiceKey);

      const { error } = await supabase
        .from('slack_integrations')
        .delete()
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
