import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Missing authorization" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // Verify caller identity
    const anonClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user: caller }, error: authError } = await anonClient.auth.getUser();
    if (authError || !caller) {
      return new Response(JSON.stringify({ error: "Invalid token" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Verify super_admin role
    const adminClient = createClient(supabaseUrl, serviceRoleKey);
    const { data: roleRow } = await adminClient
      .from("user_roles")
      .select("id")
      .eq("user_id", caller.id)
      .eq("role", "super_admin")
      .maybeSingle();

    if (!roleRow) {
      return new Response(JSON.stringify({ error: "Forbidden: super_admin required" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Parse & validate body
    const body = await req.json();
    const { userId, newEmail } = body as { userId?: string; newEmail?: string };

    if (!userId || !newEmail) {
      return new Response(JSON.stringify({ error: "userId and newEmail are required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(newEmail)) {
      return new Response(JSON.stringify({ error: "Invalid email format" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (userId === caller.id) {
      return new Response(JSON.stringify({ error: "Cannot change your own email via admin panel" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get old email for audit
    const { data: oldProfile } = await adminClient
      .from("profiles")
      .select("email")
      .eq("user_id", userId)
      .single();

    const oldEmail = oldProfile?.email || "unknown";

    // Update auth.users
    const { error: authUpdateError } = await adminClient.auth.admin.updateUserById(userId, {
      email: newEmail,
      email_confirm: true,
    });

    if (authUpdateError) {
      console.error("Auth update error:", authUpdateError);
      return new Response(JSON.stringify({ error: authUpdateError.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Update profiles table
    const { error: profileError } = await adminClient
      .from("profiles")
      .update({ email: newEmail })
      .eq("user_id", userId);

    if (profileError) {
      console.error("Profile update error:", profileError);
      // Auth was already updated, log but don't fail
    }

    // Audit log
    try {
      await adminClient.from("admin_audit_logs").insert({
        action_type: "user.email.change",
        action_category: "user_management",
        actor_id: caller.id,
        actor_email: caller.email || "unknown",
        actor_role: "super_admin",
        target_type: "user",
        target_id: userId,
        target_identifier: newEmail,
        changes: { old_email: oldEmail, new_email: newEmail },
      });
    } catch (e) {
      console.error("Audit log error:", e);
    }

    return new Response(
      JSON.stringify({ success: true, oldEmail, newEmail }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("Unexpected error:", err);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
