import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Verify user is authenticated and is super_admin
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: "Invalid auth token" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check if user is super_admin
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("user_id", user.id)
      .single();

    if (profile?.role !== "super_admin") {
      return new Response(
        JSON.stringify({ error: "Forbidden - super_admin only" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const body = await req.json();
    const { token: newToken, action, organizationId } = body;

    // GET current config (org-scoped)
    if (action === "get-config") {
      const currentEnvToken = Deno.env.get("SENDGRID_INBOUND_TOKEN");
      const projectId = "qgfaycwsangsqzpveoup";
      const webhookBaseUrl = `https://${projectId}.supabase.co/functions/v1/sendgrid-inbound`;

      // Get tokens from database - org-scoped if provided
      let query = supabase
        .from("inbound_routes")
        .select("id, address, secret_token, organization_id")
        .order("created_at", { ascending: false });

      if (organizationId) {
        query = query.eq("organization_id", organizationId);
      }

      const { data: routes } = await query;

      const dbToken = routes?.[0]?.secret_token || null;

      return new Response(
        JSON.stringify({
          success: true,
          config: {
            webhookBaseUrl,
            envToken: currentEnvToken ? "configured" : null,
            envTokenPreview: currentEnvToken ? `${currentEnvToken.slice(0, 8)}...` : null,
            dbToken,
            tokensMatch: currentEnvToken === dbToken,
            fullWebhookUrl: dbToken ? `${webhookBaseUrl}?token=${dbToken}` : webhookBaseUrl,
            routes: routes?.map(r => ({ 
              id: r.id, 
              address: r.address, 
              hasToken: !!r.secret_token,
              organizationId: r.organization_id 
            })),
            organizationId,
          },
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // UPDATE token in database (org-scoped)
    if (action === "update-token" && newToken) {
      let updateQuery = supabase
        .from("inbound_routes")
        .update({ secret_token: newToken })
        .neq("id", "00000000-0000-0000-0000-000000000000");

      if (organizationId) {
        updateQuery = updateQuery.eq("organization_id", organizationId);
      }

      const { error: updateError } = await updateQuery;

      if (updateError) {
        console.error("Failed to update inbound routes:", updateError);
        return new Response(
          JSON.stringify({ error: "Failed to update database", details: updateError.message }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const projectId = "qgfaycwsangsqzpveoup";
      const webhookUrl = `https://${projectId}.supabase.co/functions/v1/sendgrid-inbound?token=${newToken}`;

      console.log(`Token updated in database${organizationId ? ` for org ${organizationId}` : ''}. New webhook URL: ${webhookUrl}`);

      return new Response(
        JSON.stringify({
          success: true,
          message: "Token updated in database",
          webhookUrl,
          organizationId,
          nextStep: "Update SENDGRID_INBOUND_TOKEN in Supabase secrets to match",
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // TEST webhook with token
    if (action === "test-token") {
      const testToken = body.testToken;
      const currentEnvToken = Deno.env.get("SENDGRID_INBOUND_TOKEN");

      return new Response(
        JSON.stringify({
          success: true,
          tokenMatch: testToken === currentEnvToken,
          envTokenConfigured: !!currentEnvToken,
          organizationId,
          message: testToken === currentEnvToken 
            ? "Token matches! Webhook should accept requests with this token."
            : currentEnvToken 
              ? "Token mismatch! The provided token does not match SENDGRID_INBOUND_TOKEN."
              : "No SENDGRID_INBOUND_TOKEN configured in Supabase secrets.",
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ error: "Invalid action" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Error in update-sendgrid-token:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error", details: String(error) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
