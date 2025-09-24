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

/**
 * Timezone-aware scheduler for processing snooze notifications
 * Considers user timezones when determining if a snooze period has expired
 */
serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log("🔔 Starting timezone-aware snooze processing...");
    
    // Get current UTC time
    const nowUTC = new Date();
    console.log(`Current UTC time: ${nowUTC.toISOString()}`);

    // Find conversations with active snooze that might need processing
    const { data: snoozedConversations, error: fetchError } = await supabase
      .from("conversations")
      .select(`
        id, 
        subject, 
        assigned_to_id, 
        snoozed_by_id, 
        organization_id,
        snooze_until,
        profiles!conversations_snoozed_by_id_fkey(timezone, time_format)
      `)
      .not("snooze_until", "is", null)
      .eq("is_archived", false);

    if (fetchError) throw fetchError;

    const results: Array<{ 
      id: string; 
      notified: string | null; 
      timezone: string;
      snoozeTime: string;
      wasReady: boolean;
    }> = [];

    for (const conv of snoozedConversations || []) {
      const snoozeUntil = new Date(conv.snooze_until);
      const userTimezone = (conv.profiles as any)?.timezone || 'UTC';
      
      console.log(`Checking conversation ${conv.id}:`);
      console.log(`  - Snooze until: ${snoozeUntil.toISOString()}`);
      console.log(`  - User timezone: ${userTimezone}`);
      
      // Check if snooze time has passed in UTC (since that's how we store it)
      const isReady = nowUTC >= snoozeUntil;
      
      if (isReady) {
        console.log(`  ✅ Snooze expired for conversation ${conv.id}`);
        
        const notifyUser = conv.assigned_to_id || conv.snoozed_by_id;
        
        // Create timezone-aware notification message
        const userLocalTime = new Intl.DateTimeFormat('en-US', {
          timeZone: userTimezone,
          weekday: 'short',
          month: 'short', 
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
          hour12: (conv.profiles as any)?.time_format !== '24h'
        }).format(nowUTC);

        // Insert notification if we have a target user
        if (notifyUser) {
          const { error: notifyError } = await supabase.from("notifications").insert({
            user_id: notifyUser,
            title: "Snoozed conversation is back",
            message: `Reminder: ${conv.subject || "Untitled conversation"} (at ${userLocalTime})`,
            type: "info",
            data: { 
              conversation_id: conv.id,
              snooze_completed_at: nowUTC.toISOString(),
              user_timezone: userTimezone
            },
          });
          
          if (notifyError) {
            console.error(`Failed to create notification for user ${notifyUser}:`, notifyError);
          } else {
            console.log(`  📬 Notification sent to user ${notifyUser}`);
          }
        }

        // Clear snooze so it returns to inbox
        const { error: updateError } = await supabase
          .from("conversations")
          .update({ snooze_until: null })
          .eq("id", conv.id);
          
        if (updateError) {
          console.error(`Failed to clear snooze for conversation ${conv.id}:`, updateError);
        } else {
          console.log(`  🔄 Snooze cleared for conversation ${conv.id}`);
        }

        results.push({ 
          id: conv.id, 
          notified: notifyUser || null,
          timezone: userTimezone,
          snoozeTime: snoozeUntil.toISOString(),
          wasReady: true
        });
      } else {
        console.log(`  ⏳ Snooze still active for conversation ${conv.id}`);
        results.push({ 
          id: conv.id, 
          notified: null,
          timezone: userTimezone,
          snoozeTime: snoozeUntil.toISOString(),
          wasReady: false
        });
      }
    }

    const processedCount = results.filter(r => r.wasReady).length;
    const totalChecked = results.length;
    
    console.log(`🏁 Processing complete: ${processedCount}/${totalChecked} conversations were ready`);

    return new Response(JSON.stringify({ 
      processed: processedCount,
      totalChecked,
      currentTime: nowUTC.toISOString(),
      results 
    }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (err: any) {
    console.error("❌ timezone-aware-scheduler error:", err);
    return new Response(JSON.stringify({ 
      error: err.message,
      timestamp: new Date().toISOString() 
    }), {
      status: 500,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }
});