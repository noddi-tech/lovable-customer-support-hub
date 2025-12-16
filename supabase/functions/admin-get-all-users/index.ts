import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

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

    // Service client to bypass RLS
    const serviceClient = createClient(supabaseUrl, supabaseServiceKey);

    // Get the requesting user
    const { data: { user }, error: userError } = await userClient.auth.getUser();
    if (userError || !user) {
      console.error('[admin-get-all-users] Auth error:', userError);
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if user is super_admin using service client
    const { data: roleData, error: roleError } = await serviceClient
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .eq('role', 'super_admin')
      .maybeSingle();

    if (roleError) {
      console.error('[admin-get-all-users] Role check error:', roleError);
      return new Response(
        JSON.stringify({ error: 'Failed to verify permissions' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!roleData) {
      console.log('[admin-get-all-users] User is not super_admin:', user.email);
      return new Response(
        JSON.stringify({ error: 'Forbidden: Super Admin access required' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('[admin-get-all-users] Super admin verified:', user.email);

    // Parse request body for optional filters
    let orgFilter = 'all';
    try {
      const body = await req.json();
      orgFilter = body.orgFilter || 'all';
    } catch {
      // No body or invalid JSON, use defaults
    }

    // Fetch all data using service client (bypasses RLS)
    const [profilesResult, membershipsResult, rolesResult] = await Promise.all([
      serviceClient
        .from('profiles')
        .select('id, user_id, email, full_name, created_at')
        .order('created_at', { ascending: false }),
      serviceClient
        .from('organization_memberships')
        .select(`
          id,
          user_id,
          role,
          status,
          organization:organizations(id, name)
        `),
      serviceClient
        .from('user_roles')
        .select('user_id, role')
    ]);

    if (profilesResult.error) {
      console.error('[admin-get-all-users] Profiles error:', profilesResult.error);
      throw profilesResult.error;
    }
    if (membershipsResult.error) {
      console.error('[admin-get-all-users] Memberships error:', membershipsResult.error);
      throw membershipsResult.error;
    }
    if (rolesResult.error) {
      console.error('[admin-get-all-users] Roles error:', rolesResult.error);
      throw rolesResult.error;
    }

    const profiles = profilesResult.data || [];
    const memberships = membershipsResult.data || [];
    const roles = rolesResult.data || [];

    console.log(`[admin-get-all-users] Fetched ${profiles.length} profiles, ${memberships.length} memberships, ${roles.length} roles`);
    console.log('[admin-get-all-users] Roles data:', JSON.stringify(roles.slice(0, 10)));

    // Join data by user_id
    const usersWithData = profiles.map(profile => ({
      ...profile,
      organization_memberships: memberships.filter(m => m.user_id === profile.user_id),
      system_roles: roles.filter(r => r.user_id === profile.user_id).map(r => r.role)
    }));

    // Filter by organization if specified
    let filteredUsers = usersWithData;
    if (orgFilter !== 'all') {
      filteredUsers = usersWithData.filter(user =>
        user.organization_memberships?.some(
          (m: any) => m.organization?.id === orgFilter
        )
      );
    }

    console.log(`[admin-get-all-users] Returning ${filteredUsers.length} users`);

    return new Response(
      JSON.stringify({ success: true, users: filteredUsers }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[admin-get-all-users] Error:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
