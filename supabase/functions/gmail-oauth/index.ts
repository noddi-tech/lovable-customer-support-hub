import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface OAuthRequest {
  action: 'authorize' | 'callback';
  code?: string;
  state?: string;
}

const GOOGLE_CLIENT_ID = "1072539713646-gvkvnmg9v5d15fttugh6om7safekmh4p.apps.googleusercontent.com";
const GOOGLE_CLIENT_SECRET = Deno.env.get('GOOGLE_CLIENT_SECRET');
const REDIRECT_URI = `https://qgfaycwsangsqzpveoup.supabase.co/functions/v1/gmail-oauth`;
// Scopes for Gmail integration
const SCOPES = [
  'https://www.googleapis.com/auth/gmail.readonly',
  'https://www.googleapis.com/auth/gmail.send',
  'https://www.googleapis.com/auth/userinfo.email'
].join(' ');

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const code = url.searchParams.get('code');
    const state = url.searchParams.get('state');

    console.log('Gmail OAuth request:', { hasCode: !!code, hasState: !!state, url: url.pathname });

    // If there's a code parameter, this is a callback from Google - handle without auth
    if (code) {
      console.log('Processing OAuth callback with code:', code.substring(0, 20) + '...');
      
      // Exchange code for tokens
      console.log('Exchanging code for tokens...');
      const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          client_id: GOOGLE_CLIENT_ID,
          client_secret: GOOGLE_CLIENT_SECRET!,
          code,
          grant_type: 'authorization_code',
          redirect_uri: REDIRECT_URI,
        }),
      });

      const tokens = await tokenResponse.json();
      console.log('Token response status:', tokenResponse.status);
      console.log('Tokens received:', { 
        hasAccessToken: !!tokens.access_token, 
        hasRefreshToken: !!tokens.refresh_token,
        error: tokens.error 
      });
      
      if (!tokens.access_token) {
        console.error('Token exchange failed:', tokens);
        return new Response(`
          <html>
            <body>
              <h1>Error</h1>
              <p>Failed to exchange authorization code for tokens: ${tokens.error_description || tokens.error || 'Unknown error'}</p>
              <script>
                setTimeout(() => window.close(), 3000);
              </script>
            </body>
          </html>
        `, {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'text/html' },
        });
      }

      // Get user info from Google
      console.log('Getting user info from Google...');
      const userInfoResponse = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
        headers: { Authorization: `Bearer ${tokens.access_token}` },
      });
      const userInfo = await userInfoResponse.json();
      console.log('User info:', { email: userInfo.email, verified: userInfo.verified_email });

      // Create Supabase client with service role key for callback
      console.log('Creating Supabase client...');
      const supabaseClient = createClient(
        'https://qgfaycwsangsqzpveoup.supabase.co',
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
      );

      // Get user's organization using the state parameter (user ID)
      if (!state) {
        console.error('Missing state parameter in OAuth callback');
        return new Response(`
          <html>
            <body>
              <h1>Error</h1>
              <p>Missing state parameter. Please try connecting again.</p>
              <script>
                setTimeout(() => window.close(), 3000);
              </script>
            </body>
          </html>
        `, {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'text/html' },
        });
      }

      console.log('Looking up user profile for state:', state);
      const { data: profile } = await supabaseClient
        .from('profiles')
        .select('organization_id')
        .eq('user_id', state)
        .single();

      console.log('Profile lookup result:', { profile, hasOrgId: !!profile?.organization_id });

      if (!profile) {
        console.error('User profile not found for user ID:', state);
        return new Response(`
          <html>
            <body>
              <h1>Error</h1>
              <p>User profile not found. Please try again.</p>
              <script>
                setTimeout(() => window.close(), 3000);
              </script>
            </body>
          </html>
        `, {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'text/html' },
        });
      }

      // Store email account
      console.log('Storing email account...', {
        organization_id: profile.organization_id,
        user_id: state,
        email_address: userInfo.email,
        provider: 'gmail'
      });

      const { data: emailAccount, error } = await supabaseClient
        .from('email_accounts')
        .upsert({
          organization_id: profile.organization_id,
          user_id: state,
          email_address: userInfo.email,
          provider: 'gmail',
          access_token: tokens.access_token,
          refresh_token: tokens.refresh_token,
          token_expires_at: new Date(Date.now() + tokens.expires_in * 1000).toISOString(),
          is_active: true,
        }, {
          onConflict: 'email_address,organization_id'
        })
        .select();

      console.log('Email account storage result:', { 
        success: !error, 
        error: error?.message,
        accountId: emailAccount?.[0]?.id 
      });

      if (error) {
        console.error('Error storing email account:', error);
        return new Response(`
          <html>
            <body>
              <h1>Error</h1>
              <p>Failed to store email account: ${error.message}</p>
              <script>
                setTimeout(() => window.close(), 3000);
              </script>
            </body>
          </html>
        `, {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'text/html' },
        });
      }

      console.log('Gmail account connected successfully:', userInfo.email);

      // Return success page that closes the popup
      return new Response(`
        <html>
          <body>
            <h1>Success!</h1>
            <p>Gmail account "${userInfo.email}" connected successfully.</p>
            <script>
              // Send message to parent window
              if (window.opener) {
                window.opener.postMessage({ type: 'gmail_connected', email: '${userInfo.email}' }, '*');
              }
              setTimeout(() => window.close(), 2000);
            </script>
          </body>
        </html>
      `, {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'text/html' },
      });
    }

    // For non-callback requests, we need authentication to generate auth URL
    console.log('No code parameter - this is an auth URL request');
    
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Authorization required for auth URL generation' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabaseClient = createClient(
      'https://qgfaycwsangsqzpveoup.supabase.co',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: authHeader },
        },
      }
    );

    const { data: { user } } = await supabaseClient.auth.getUser();
    if (!user) {
      return new Response(JSON.stringify({ error: 'Invalid authentication' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Generate auth URL
    const authUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth');
    authUrl.searchParams.set('client_id', GOOGLE_CLIENT_ID);
    authUrl.searchParams.set('redirect_uri', REDIRECT_URI);
    authUrl.searchParams.set('scope', SCOPES);
    authUrl.searchParams.set('response_type', 'code');
    authUrl.searchParams.set('access_type', 'offline');
    authUrl.searchParams.set('prompt', 'consent');
    authUrl.searchParams.set('state', user.id);

    return new Response(JSON.stringify({ authUrl: authUrl.toString() }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error) {
    console.error('Error in gmail-oauth function:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});