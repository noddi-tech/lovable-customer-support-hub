import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ResendInviteRequest {
  email: string;
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Get authorization header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create clients
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;

    // User client to verify the requesting user
    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    // Service client with admin privileges
    const adminClient = createClient(supabaseUrl, supabaseServiceKey);

    // Get the requesting user
    const { data: { user }, error: userError } = await userClient.auth.getUser();
    if (userError || !user) {
      console.error('[resend-user-invite] Auth error:', userError);
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if user is admin or super_admin using service client
    const { data: roleData, error: roleError } = await adminClient
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .in('role', ['admin', 'super_admin']);

    if (roleError) {
      console.error('[resend-user-invite] Role check error:', roleError);
      return new Response(
        JSON.stringify({ error: 'Failed to verify permissions' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!roleData || roleData.length === 0) {
      console.log('[resend-user-invite] User is not admin/super_admin:', user.email);
      return new Response(
        JSON.stringify({ error: 'Forbidden: Admin access required' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('[resend-user-invite] Admin verified:', user.email);

    // Parse request body
    const body: ResendInviteRequest = await req.json();
    const { email } = body;

    if (!email) {
      return new Response(
        JSON.stringify({ error: 'Email is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('[resend-user-invite] Resending invite to:', email);

    // Get site URL for redirect
    const siteUrl = Deno.env.get('SITE_URL') || 'https://support.noddi.co';

    // Generate a magic link for the user to set up their account
    const { data: linkData, error: linkError } = await adminClient.auth.admin.generateLink({
      type: 'magiclink',
      email: email,
      options: {
        redirectTo: `${siteUrl}/auth`,
      },
    });

    if (linkError) {
      console.error('[resend-user-invite] Generate link error:', linkError);
      return new Response(
        JSON.stringify({ error: linkError.message || 'Failed to generate invite link' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // The magic link is generated but we need to send the email
    // Use inviteUserByEmail which sends the email automatically
    // But that only works for new users, so we use generateLink + custom email or 
    // simply use the password recovery flow which sends an email
    
    // Actually, let's use the password recovery flow which sends an email to set password
    const { error: resetError } = await adminClient.auth.admin.generateLink({
      type: 'recovery',
      email: email,
      options: {
        redirectTo: `${siteUrl}/auth`,
      },
    });

    // generateLink doesn't send email, we need to use resetPasswordForEmail
    // But that requires the user to exist. Let's try a different approach.
    
    // Use the OTP sending endpoint which sends an email
    const { error: otpError } = await adminClient.auth.signInWithOtp({
      email: email,
      options: {
        emailRedirectTo: `${siteUrl}/auth`,
        shouldCreateUser: false, // Don't create new user, just send login link
      },
    });

    if (otpError) {
      console.error('[resend-user-invite] OTP error:', otpError);
      // Try password recovery as fallback
      const { error: recoveryError } = await adminClient.auth.resetPasswordForEmail(email, {
        redirectTo: `${siteUrl}/auth`,
      });
      
      if (recoveryError) {
        console.error('[resend-user-invite] Recovery error:', recoveryError);
        return new Response(
          JSON.stringify({ error: recoveryError.message || 'Failed to send invite email' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    console.log('[resend-user-invite] Successfully sent invite to:', email);

    // Log audit action
    try {
      await adminClient.from('admin_audit_logs').insert({
        actor_id: user.id,
        actor_email: user.email || '',
        actor_role: roleData[0].role,
        action_type: 'user.invite.resend',
        action_category: 'user',
        target_type: 'user',
        target_identifier: email,
        changes: { email, resent_by: user.email },
      });
    } catch (auditError) {
      console.error('[resend-user-invite] Audit log error:', auditError);
    }

    return new Response(
      JSON.stringify({ success: true, message: 'Invite email sent successfully' }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[resend-user-invite] Error:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
