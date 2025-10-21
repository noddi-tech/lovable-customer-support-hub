import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    if (req.method !== "POST") {
      return new Response(JSON.stringify({ error: "Method not allowed" }), { 
        status: 405, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      });
    }

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { 
        status: 401, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      });
    }

    // Get environment variables
    const sgKey = Deno.env.get('SENDGRID_API_KEY');
    const inboundToken = Deno.env.get('SENDGRID_INBOUND_TOKEN');
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    
    if (!sgKey || !inboundToken || !supabaseUrl) {
      return new Response(JSON.stringify({ 
        error: "Missing required environment variables",
        missing: {
          SENDGRID_API_KEY: !sgKey,
          SENDGRID_INBOUND_TOKEN: !inboundToken,
          SUPABASE_URL: !supabaseUrl
        }
      }), { 
        status: 500, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      });
    }

    const correctWebhookUrl = `${supabaseUrl}/functions/v1/sendgrid-inbound?token=${inboundToken}`;
    
    // Get current SendGrid webhook settings
    console.log("🔍 Getting current SendGrid webhook settings...");
    const getResp = await fetch('https://api.sendgrid.com/v3/user/webhooks/parse/settings', {
      headers: { 'Authorization': `Bearer ${sgKey}` },
    });
    
    if (!getResp.ok) {
      const error = await getResp.json().catch(() => ({}));
      return new Response(JSON.stringify({ 
        error: "Failed to get current webhook settings",
        details: error,
        status: getResp.status
      }), { 
        status: 500, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      });
    }

    const currentSettings = await getResp.json();
    console.log("📋 Current SendGrid settings:", JSON.stringify(currentSettings, null, 2));
    
    // Find the webhook for inbound.noddi.no
    const targetHostname = "inbound.noddi.no";
    const existingWebhook = currentSettings.result?.find((webhook: any) => 
      webhook.hostname === targetHostname
    );

    if (!existingWebhook) {
      return new Response(JSON.stringify({ 
        error: "Webhook not found for hostname",
        hostname: targetHostname,
        currentSettings: currentSettings.result?.map((w: any) => ({ 
          hostname: w.hostname, 
          url: w.url 
        }))
      }), { 
        status: 404, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      });
    }

    console.log("🎯 Found webhook:", JSON.stringify(existingWebhook, null, 2));

    // Check if the URL is already correct
    if (existingWebhook.url === correctWebhookUrl) {
      return new Response(JSON.stringify({ 
        success: true,
        message: "Webhook URL is already correct",
        hostname: targetHostname,
        currentUrl: existingWebhook.url,
        status: "no_change_needed"
      }), { 
        status: 200, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      });
    }

    // Update the webhook URL
    console.log("🔧 Updating webhook URL...");
    console.log("From:", existingWebhook.url);
    console.log("To:", correctWebhookUrl);
    
    const updateResp = await fetch(`https://api.sendgrid.com/v3/user/webhooks/parse/settings/${existingWebhook.id}`, {
      method: 'PATCH',
      headers: { 
        'Authorization': `Bearer ${sgKey}`, 
        'Content-Type': 'application/json' 
      },
      body: JSON.stringify({ 
        url: correctWebhookUrl,
        hostname: targetHostname,
        spam_check: existingWebhook.spam_check || true,
        send_raw: existingWebhook.send_raw || false
      }),
    });

    const updateResult = await updateResp.json().catch(() => ({}));
    
    if (!updateResp.ok) {
      return new Response(JSON.stringify({ 
        error: "Failed to update webhook URL", 
        details: updateResult,
        status: updateResp.status,
        currentUrl: existingWebhook.url,
        attemptedUrl: correctWebhookUrl
      }), { 
        status: 500, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      });
    }

    // Update the database with the correct token
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { error: dbError } = await supabase
      .from('inbound_routes')
      .update({ secret_token: inboundToken })
      .like('address', '%@inbound.noddi.no');

    if (dbError) {
      console.error("Database update error:", dbError);
    }

    return new Response(JSON.stringify({ 
      success: true,
      message: "SendGrid webhook URL updated successfully",
      hostname: targetHostname,
      previousUrl: existingWebhook.url,
      newUrl: correctWebhookUrl,
      webhookId: existingWebhook.id,
      updateResult,
      databaseUpdated: !dbError,
      databaseError: dbError?.message || null
    }), { 
      status: 200, 
      headers: { ...corsHeaders, "Content-Type": "application/json" } 
    });

  } catch (error) {
    console.error('fix-sendgrid-webhook error:', error);
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined
    }), { 
      status: 500, 
      headers: { ...corsHeaders, "Content-Type": "application/json" } 
    });
  }
});