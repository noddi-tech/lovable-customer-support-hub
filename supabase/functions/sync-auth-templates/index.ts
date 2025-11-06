import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface SystemEmailTemplate {
  template_type: string;
  subject: string;
  html_content: string;
  is_active: boolean;
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log("🔄 Starting auth template sync...");

    // Create Supabase client with user's auth token
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      {
        global: {
          headers: { Authorization: req.headers.get("Authorization")! },
        },
      }
    );

    // Authenticate user
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser();
    if (authError || !user) {
      console.error("❌ Authentication failed:", authError);
      throw new Error("Unauthorized");
    }

    console.log("✅ User authenticated:", user.id);

    // Verify super admin role
    const { data: userRoles, error: roleError } = await supabaseClient
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("role", "super_admin")
      .single();

    if (roleError || !userRoles) {
      console.error("❌ Not a super admin:", roleError);
      throw new Error("Only super admins can sync email templates");
    }

    console.log("✅ Super admin verified");

    // Fetch templates from database
    const { data: templates, error: fetchError } = await supabaseClient
      .from("system_email_templates")
      .select("*")
      .eq("is_active", true);

    if (fetchError) {
      console.error("❌ Error fetching templates:", fetchError);
      throw fetchError;
    }

    console.log(`📧 Found ${templates?.length || 0} active templates`);

    // Map template types to Supabase Auth config keys
    const templateMap: Record<string, string> = {
      password_reset: "recovery",
      magic_link: "magic_link",
      email_confirmation: "confirmation",
      email_change: "email_change",
    };

    // Build config object for Supabase Auth
    const authConfig: Record<string, string> = {};
    
    (templates as SystemEmailTemplate[]).forEach((template) => {
      const authKey = templateMap[template.template_type];
      if (authKey) {
        authConfig[`mailer_subjects_${authKey}`] = template.subject;
        authConfig[`mailer_templates_${authKey}_content`] = template.html_content;
        console.log(`📝 Mapping ${template.template_type} to ${authKey}`);
      }
    });

    // Get Supabase Management API credentials
    const projectRef = Deno.env.get("SUPABASEPROJECT_REF");
    const accessToken = Deno.env.get("SUPABASEACCESS_TOKEN");

    if (!projectRef || !accessToken) {
      console.error("❌ Missing required environment variables");
      throw new Error("Missing SUPABASEPROJECT_REF or SUPABASEACCESS_TOKEN environment variables. Please configure these secrets in your project settings.");
    }

    console.log(`🔑 Using project ref: ${projectRef}`);

    // Update Supabase Auth config via Management API
    const managementApiUrl = `https://api.supabase.com/v1/projects/${projectRef}/config/auth`;
    console.log(`🌐 Calling Management API: ${managementApiUrl}`);

    const response = await fetch(managementApiUrl, {
      method: "PATCH",
      headers: {
        "Authorization": `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(authConfig),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("❌ Supabase API error:", errorText);
      throw new Error(`Supabase API error: ${errorText}`);
    }

    const result = await response.json();
    const syncedCount = Object.keys(authConfig).length / 2; // Each template has subject + content

    console.log(`✅ Successfully synced ${syncedCount} templates`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: "Auth templates synced successfully",
        synced: syncedCount,
        result 
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  } catch (error: any) {
    console.error("❌ Error in sync-auth-templates:", error);
    return new Response(
      JSON.stringify({ 
        error: error.message,
        details: "Check the function logs for more information"
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);
