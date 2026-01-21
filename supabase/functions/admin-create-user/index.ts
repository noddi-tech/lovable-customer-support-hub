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
  send_invite?: boolean; // Default true - sends invite email
  password?: string; // Only used when send_invite is false
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
    const { email, full_name, organizations, send_invite, password, department_id, primary_role }: CreateUserRequest = await req.json();

    if (!email || !full_name) {
      return new Response(JSON.stringify({ error: "Email and full name are required" }), {
        status: 400,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    // Determine if we should send invite (default: true)
    const shouldSendInvite = send_invite !== false;

    // Validate password if not sending invite
    if (!shouldSendInvite) {
      if (!password || password.length < 6) {
        return new Response(JSON.stringify({ error: "Password must be at least 6 characters when not sending invite" }), {
          status: 400,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        });
      }
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

    console.log("Creating user:", { email, full_name, organizations: orgsToAssign, sendInvite: shouldSendInvite });

    // Get primary org for the pending membership
    const primaryOrg = orgsToAssign[0];

    // 6. For invite flow: Create invited organization membership BEFORE user creation
    // This allows the handle_new_user trigger to find it and use the correct org
    if (shouldSendInvite) {
      const inviteExpiresAt = new Date();
      inviteExpiresAt.setDate(inviteExpiresAt.getDate() + 7); // 7 day expiry
      
      const { error: inviteError } = await adminClient
        .from("organization_memberships")
        .insert({
          email: email,
          organization_id: primaryOrg.org_id,
          role: primaryOrg.role,
          status: 'invited',
          invite_expires_at: inviteExpiresAt.toISOString(),
          is_default: true,
        });
      
      if (inviteError) {
        console.error("Error creating invited membership:", inviteError);
        // If it's a duplicate, that's okay - continue
        if (!inviteError.message?.includes('duplicate')) {
          return new Response(JSON.stringify({ error: "Failed to create invite: " + inviteError.message }), {
            status: 500,
            headers: { "Content-Type": "application/json", ...corsHeaders },
          });
        }
      }
      console.log("Created invited membership for:", email, "org:", primaryOrg.org_id);
    }

    // 7. Create user - either via invite or direct creation
    let authData: { user: any } | null = null;
    let createError: any = null;

    if (shouldSendInvite) {
      // Use invite flow - sends welcome email automatically
      const result = await adminClient.auth.admin.inviteUserByEmail(email, {
        data: { full_name },
        redirectTo: `${Deno.env.get('SITE_URL') || 'https://support.noddi.co'}/auth`,
      });
      authData = result.data;
      createError = result.error;
    } else {
      // Direct creation with admin-set password
      const result = await adminClient.auth.admin.createUser({
        email,
        password,
        email_confirm: true, // Auto-confirm email since admin is creating
        user_metadata: { full_name },
      });
      authData = result.data;
      createError = result.error;
    }

    if (createError) {
      console.error("Error creating user:", createError);
      return new Response(JSON.stringify({ error: createError.message }), {
        status: 400,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    if (!authData?.user) {
      return new Response(JSON.stringify({ error: "Failed to create user" }), {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    console.log("User created:", authData.user.id);

    // 7. Create or update profile (use upsert to handle both cases)
    // Wait a bit for the trigger to potentially create the profile
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Use the first organization as the primary one for the profile
    // (primaryOrg was already defined earlier)

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
        role: primaryOrg.role, // Also set the legacy role field
      }, {
        onConflict: 'user_id',
      });

    if (upsertError) {
      console.error("Error upserting profile:", upsertError);
      return new Response(JSON.stringify({ error: "Database error saving new user: " + upsertError.message }), {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    // 9. Create organization memberships for ADDITIONAL organizations
    // Skip first org for invite flow since it was created as pending and activated by trigger
    const startIndex = shouldSendInvite ? 1 : 0;
    for (let i = startIndex; i < orgsToAssign.length; i++) {
      const org = orgsToAssign[i];
      const { error: membershipError } = await adminClient
        .from("organization_memberships")
        .upsert({
          user_id: authData.user.id,
          organization_id: org.org_id,
          role: org.role,
          status: 'active',
          is_default: false, // First org is already default
          joined_at: new Date().toISOString(),
        }, {
          onConflict: 'user_id,organization_id',
        });

      if (membershipError) {
        console.error("Error creating organization membership:", membershipError);
        // Continue with other memberships
      }
    }

    // For direct creation (no invite), create the first org membership too
    if (!shouldSendInvite) {
      const { error: primaryMembershipError } = await adminClient
        .from("organization_memberships")
        .upsert({
          user_id: authData.user.id,
          organization_id: primaryOrg.org_id,
          role: primaryOrg.role,
          status: 'active',
          is_default: true,
          joined_at: new Date().toISOString(),
        }, {
          onConflict: 'user_id,organization_id',
        });

      if (primaryMembershipError) {
        console.error("Error creating primary organization membership:", primaryMembershipError);
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

    console.log("User setup complete:", authData.user.id, "with", orgsToAssign.length, "organization(s)", shouldSendInvite ? "(invite sent)" : "(password set)");

    // 10. Log the invite email attempt
    try {
      await adminClient.from('invite_email_logs').insert({
        user_id: authData.user.id,
        email: email,
        email_type: shouldSendInvite ? 'invite' : 'direct_creation',
        status: shouldSendInvite ? 'sent' : 'not_applicable',
        provider: 'supabase_auth',
        sent_by_id: requestingUser.id,
        organization_id: primaryOrg.org_id,
        metadata: { full_name, organizations: orgsToAssign.map(o => ({ org_id: o.org_id, role: o.role })) },
      });
      console.log("Invite email logged for:", email);
    } catch (logError) {
      console.error("Error logging invite email:", logError);
      // Don't fail the operation if logging fails
    }

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
