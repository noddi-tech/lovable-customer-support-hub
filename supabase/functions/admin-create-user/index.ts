import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface CreateUserRequest {
  email: string;
  password: string;
  full_name: string;
  department_id?: string | null;
  primary_role?: string;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // 1. Verify the requesting user is authenticated
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Missing authorization header" }), {
        status: 401,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    const userClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user: requestingUser }, error: authError } = await userClient.auth.getUser();
    if (authError || !requestingUser) {
      console.error("Auth error:", authError);
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    // 2. Check if requesting user has admin privileges (via user_roles table)
    const adminClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    
    const { data: roles, error: rolesError } = await adminClient
      .from("user_roles")
      .select("role")
      .eq("user_id", requestingUser.id);

    if (rolesError) {
      console.error("Error fetching roles:", rolesError);
      return new Response(JSON.stringify({ error: "Failed to verify permissions" }), {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    const hasAdminRole = roles?.some(r => r.role === 'admin' || r.role === 'super_admin');
    if (!hasAdminRole) {
      console.log("User does not have admin role:", requestingUser.id, roles);
      return new Response(JSON.stringify({ error: "Forbidden: Admin privileges required" }), {
        status: 403,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    // 3. Get the requesting user's organization
    const { data: requestingProfile, error: profileFetchError } = await adminClient
      .from("profiles")
      .select("organization_id")
      .eq("user_id", requestingUser.id)
      .single();

    if (profileFetchError || !requestingProfile?.organization_id) {
      console.error("Error fetching requesting user's profile:", profileFetchError);
      return new Response(JSON.stringify({ error: "Failed to get user organization" }), {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    // 4. Parse request
    const { email, password, full_name, department_id, primary_role }: CreateUserRequest = await req.json();

    if (!email || !password || !full_name) {
      return new Response(JSON.stringify({ error: "Email, password, and full name are required" }), {
        status: 400,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    console.log("Creating user:", { email, full_name, department_id, primary_role });

    // 5. Use service_role client to create user
    const { data: authData, error: createError } = await adminClient.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name },
    });

    if (createError) {
      console.error("Error creating user:", createError);
      return new Response(JSON.stringify({ error: createError.message }), {
        status: 400,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    if (!authData.user) {
      return new Response(JSON.stringify({ error: "Failed to create user" }), {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    console.log("User created:", authData.user.id);

    // 6. Update profile with additional data (profile is created by trigger)
    // Wait a bit for the trigger to create the profile
    await new Promise(resolve => setTimeout(resolve, 500));

    const { error: updateError } = await adminClient
      .from("profiles")
      .update({
        full_name,
        department_id: department_id || null,
        primary_role: primary_role || 'user',
        organization_id: requestingProfile.organization_id,
      })
      .eq("user_id", authData.user.id);

    if (updateError) {
      console.error("Error updating profile:", updateError);
      // Don't fail the whole operation if profile update fails
    }

    // 7. Create organization membership
    const { error: membershipError } = await adminClient
      .from("organization_memberships")
      .insert({
        user_id: authData.user.id,
        organization_id: requestingProfile.organization_id,
        role: primary_role || 'user',
        status: 'active',
        is_default: true,
        joined_at: new Date().toISOString(),
      });

    if (membershipError) {
      console.error("Error creating organization membership:", membershipError);
      // Don't fail the whole operation if membership creation fails
    }

    // 8. Assign role in user_roles table
    const { error: roleError } = await adminClient
      .from("user_roles")
      .insert({
        user_id: authData.user.id,
        role: primary_role || 'user',
        created_by_id: requestingUser.id,
      });

    if (roleError) {
      console.error("Error assigning role:", roleError);
      // Don't fail the whole operation if role assignment fails
    }

    console.log("User setup complete:", authData.user.id);

    return new Response(JSON.stringify({ success: true, user: authData.user }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });

  } catch (error: any) {
    console.error("Unexpected error:", error);
    return new Response(JSON.stringify({ error: error.message || "Internal server error" }), {
      status: 500,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }
});
