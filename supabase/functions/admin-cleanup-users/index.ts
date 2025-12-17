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
    // Get the authorization header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create Supabase client with the user's token
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabaseAdmin = createClient(supabaseUrl, supabaseKey, {
      auth: { autoRefreshToken: false, persistSession: false }
    });

    // Verify the user is a super admin
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);
    
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Invalid authorization token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if user is super admin
    const { data: roles } = await supabaseAdmin
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id);

    const isSuperAdmin = roles?.some(r => r.role === 'super_admin');
    if (!isSuperAdmin) {
      return new Response(
        JSON.stringify({ error: 'Super admin access required' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const method = req.method;

    if (method === 'GET') {
      // List orphaned auth users (users in auth.users without profiles)
      console.log('Fetching orphaned auth users...');

      // Get all auth users
      const { data: authUsers, error: authUsersError } = await supabaseAdmin.auth.admin.listUsers({
        perPage: 1000
      });

      if (authUsersError) {
        console.error('Error fetching auth users:', authUsersError);
        return new Response(
          JSON.stringify({ error: 'Failed to fetch auth users' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Get all profile user_ids
      const { data: profiles, error: profilesError } = await supabaseAdmin
        .from('profiles')
        .select('user_id');

      if (profilesError) {
        console.error('Error fetching profiles:', profilesError);
        return new Response(
          JSON.stringify({ error: 'Failed to fetch profiles' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const profileUserIds = new Set(profiles?.map(p => p.user_id) || []);
      
      // Find orphaned users
      const orphanedUsers = authUsers.users.filter(u => !profileUserIds.has(u.id)).map(u => ({
        id: u.id,
        email: u.email,
        created_at: u.created_at,
      }));

      console.log(`Found ${orphanedUsers.length} orphaned users out of ${authUsers.users.length} total auth users`);

      return new Response(
        JSON.stringify({ 
          success: true, 
          orphaned_users: orphanedUsers,
          total_auth_users: authUsers.users.length,
          total_profiles: profiles?.length || 0
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (method === 'POST') {
      const body = await req.json();
      const { action, user_ids } = body;

      if (action === 'delete') {
        if (!user_ids || !Array.isArray(user_ids) || user_ids.length === 0) {
          return new Response(
            JSON.stringify({ error: 'user_ids array is required' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        console.log(`Deleting ${user_ids.length} orphaned users...`);
        
        const results = { 
          deleted: [] as string[], 
          already_deleted: [] as string[],
          errors: [] as { id: string; error: string }[] 
        };

        for (const userId of user_ids) {
          try {
            const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(userId);
            if (deleteError) {
              // Treat "user not found" as already deleted (success)
              if (deleteError.message?.toLowerCase().includes('not found') || 
                  deleteError.message?.toLowerCase().includes('user not found') ||
                  (deleteError as any).status === 404) {
                results.already_deleted.push(userId);
              } else {
                results.errors.push({ id: userId, error: deleteError.message });
              }
            } else {
              results.deleted.push(userId);
            }
          } catch (e) {
            const errMsg = String(e).toLowerCase();
            if (errMsg.includes('not found') || errMsg.includes('404')) {
              results.already_deleted.push(userId);
            } else {
              results.errors.push({ id: userId, error: String(e) });
            }
          }
        }

        console.log(`Deleted ${results.deleted.length} users, ${results.already_deleted.length} already deleted, ${results.errors.length} errors`);

        return new Response(
          JSON.stringify({ 
            success: true, 
            deleted_count: results.deleted.length,
            already_deleted_count: results.already_deleted.length,
            error_count: results.errors.length,
            errors: results.errors
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      return new Response(
        JSON.stringify({ error: 'Invalid action. Use "delete"' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ error: 'Method not allowed' }),
      { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in admin-cleanup-users:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
