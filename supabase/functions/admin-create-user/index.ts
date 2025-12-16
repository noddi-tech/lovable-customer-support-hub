import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface OrganizationAssignment {
  org_id: string;
  role: string;
}

interface CreateUserRequest {
  email: string;
  full_name: string;
  organizations?: OrganizationAssignment[];
  // Backwards compatibility
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

    const isSuperAdmin = roles?.some(r => r.role === 'super_admin');
    const hasAdminRole = roles?.some(r => r.role === 'admin' || r.role === 'super_admin');
    
    if (!hasAdminRole) {
      console.log("User does not have admin role:", requestingUser.id, roles);
      return new Response(JSON.stringify({ error: "Forbidden: Admin privileges required" }), {
        status: 403,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    // 3. Get the requesting user's organization (for backwards compat and non-super-admin validation)
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
    const { email, full_name, organizations, department_id, primary_role }: CreateUserRequest = await req.json();

    if (!email || !full_name) {
      return new Response(JSON.stringify({ error: "Email and full name are required" }), {
        status: 400,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    // 5. Determine organizations to assign
    let orgsToAssign: OrganizationAssignment[] = organizations || [];

    // Backwards compatibility: if no organizations provided, use requesting admin's org
    if (orgsToAssign.length === 0) {
      orgsToAssign = [{ org_id: requestingProfile.organization_id, role: primary_role || 'user' }];
    }

    // Non-super-admins can only assign users to their own organization
    if (!isSuperAdmin) {
      orgsToAssign = orgsToAssign.filter(o => o.org_id === requestingProfile.organization_id);
      if (orgsToAssign.length === 0) {
        return new Response(JSON.stringify({ error: "You can only add users to your own organization" }), {
          status: 403,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        });
      }
    }

    console.log("Creating user via invite:", { email, full_name, organizations: orgsToAssign });

    // 6. Use service_role client to invite user (sends welcome email automatically)
    const { data: authData, error: createError } = await adminClient.auth.admin.inviteUserByEmail(email, {
      data: { full_name },
      redirectTo: `${Deno.env.get('SITE_URL') || 'https://support.noddi.co'}/auth`,
    });

    if (createError) {
      console.error("Error inviting user:", createError);
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

    // 7. Create or update profile (use upsert to handle both cases)
    // Wait a bit for the trigger to potentially create the profile
    await new Promise(resolve => setTimeout(resolve, 500));

    // Use the first organization as the primary one for the profile
    const primaryOrg = orgsToAssign[0];

    // Try to upsert the profile - this handles both trigger-created and missing profiles
    const { error: upsertError } = await adminClient
      .from("profiles")
      .upsert({
        user_id: authData.user.id,
        email: email,
        full_name,
        department_id: department_id || null,
        primary_role: primaryOrg.role as any,
        organization_id: primaryOrg.org_id,
      }, {
        onConflict: 'user_id',
      });

    if (upsertError) {
      console.error("Error upserting profile:", upsertError);
      // Don't fail the whole operation if profile upsert fails
    }

    // 8. Create organization memberships for ALL specified organizations
    for (let i = 0; i < orgsToAssign.length; i++) {
      const org = orgsToAssign[i];
      const { error: membershipError } = await adminClient
        .from("organization_memberships")
        .insert({
          user_id: authData.user.id,
          organization_id: org.org_id,
          role: org.role,
          status: 'active',
          is_default: i === 0, // First org is default
          joined_at: new Date().toISOString(),
        });

      if (membershipError) {
        console.error("Error creating organization membership:", membershipError);
        // Continue with other memberships
      }
    }

    // 9. Assign role in user_roles table based on highest role
    const roleHierarchy = ['super_admin', 'admin', 'agent', 'user'];
    const highestRole = orgsToAssign
      .map(o => o.role)
      .sort((a, b) => roleHierarchy.indexOf(a) - roleHierarchy.indexOf(b))[0] || 'user';

    const { error: roleError } = await adminClient
      .from("user_roles")
      .insert({
        user_id: authData.user.id,
        role: highestRole,
        created_by_id: requestingUser.id,
      });

    if (roleError) {
      console.error("Error assigning role:", roleError);
      // Don't fail the whole operation if role assignment fails
    }

    console.log("User setup complete:", authData.user.id, "with", orgsToAssign.length, "organization(s)");

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
