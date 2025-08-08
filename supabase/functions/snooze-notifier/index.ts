import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.53.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Find conversations whose snooze has expired
    const now = new Date().toISOString();
    const { data: due, error } = await supabase
      .from("conversations")
      .select("id, subject, assigned_to_id, snoozed_by_id, organization_id")
      .not("snooze_until", "is", null)
      .lte("snooze_until", now)
      .eq("is_archived", false);

    if (error) throw error;

    const results: Array<{ id: string; notified: string | null }>= [];

    for (const conv of due || []) {
      const notifyUser = conv.assigned_to_id || conv.snoozed_by_id;

      // Insert notification if we have a target user
      if (notifyUser) {
        await supabase.from("notifications").insert({
          user_id: notifyUser,
          title: "Snoozed conversation is back",
          message: `Reminder: ${conv.subject || "Untitled conversation"}`,
          type: "info",
          data: { conversation_id: conv.id },
        });
      }

      // Clear snooze so it returns to inbox
      await supabase
        .from("conversations")
        .update({ snooze_until: null })
        .eq("id", conv.id);

      results.push({ id: conv.id, notified: notifyUser || null });
    }

    return new Response(JSON.stringify({ processed: results.length, results }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (err: any) {
    console.error("snooze-notifier error", err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }
});
