// Call notification edge function - handles call event notifications
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.53.0"
import { requireOrgMember } from "../_shared/auth.ts"

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, sentry-trace, baggage, traceparent, tracestate, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version, x-supabase-api-version, x-app-version, x-requested-with, accept, accept-profile, content-profile, prefer, range, x-region",
  "Access-Control-Allow-Methods": "GET, POST, PUT, PATCH, DELETE, OPTIONS",
}

interface CallNotificationPayload {
  callId: string
  eventType: "call_started" | "call_missed" | "call_ended" | "voicemail_received"
  customerPhone: string
  customerName?: string
  assignedToId?: string
  organizationId: string
}

type AppPrefKey = "app_on_incoming_call" | "app_on_missed_call" | "app_on_voicemail"

function prefKeyForEvent(eventType: CallNotificationPayload["eventType"]): AppPrefKey | null {
  switch (eventType) {
    case "call_started":
      return "app_on_incoming_call"
    case "call_missed":
      return "app_on_missed_call"
    case "voicemail_received":
      return "app_on_voicemail"
    case "call_ended":
      return null
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    const payload: CallNotificationPayload = await req.json()
    const { callId, eventType, customerPhone, customerName, assignedToId, organizationId } = payload

    if (!organizationId) {
      return new Response(JSON.stringify({ error: "organizationId is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      })
    }

    // Authorization: caller must belong to the target organization (or be an internal service).
    const auth = await requireOrgMember(req, organizationId)
    if ("response" in auth) return auth.response

    // call_ended has no settings row — skip personal notifications
    const prefKey = prefKeyForEvent(eventType)
    if (!prefKey) {
      return new Response(
        JSON.stringify({ success: true, message: "Skipped call_ended personal notification" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      )
    }

    let title = ""
    let message = ""
    let notificationType: "info" | "warning" | "success" = "info"

    switch (eventType) {
      case "call_started":
        title = "Incoming Call"
        message = `Call from ${customerName || customerPhone}`
        break
      case "call_missed":
        title = "Missed Call"
        message = `You missed a call from ${customerName || customerPhone}`
        notificationType = "warning"
        break
      case "voicemail_received":
        title = "New Voicemail"
        message = `Voicemail from ${customerName || customerPhone}`
        notificationType = "info"
        break
    }

    const targetUserIds: string[] = []
    if (assignedToId) {
      targetUserIds.push(assignedToId)
    } else {
      const { data: agents } = await supabase
        .from("profiles")
        .select("user_id")
        .eq("organization_id", organizationId)
        .eq("is_active", true)

      for (const agent of agents || []) {
        if (agent.user_id) targetUserIds.push(agent.user_id)
      }
    }

    if (targetUserIds.length === 0) {
      return new Response(JSON.stringify({ success: true, message: "No recipients" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      })
    }

    const { data: prefsRows } = await supabase
      .from("notification_preferences")
      .select(`user_id, ${prefKey}`)
      .eq("organization_id", organizationId)
      .in("user_id", targetUserIds)

    const prefsByUser = new Map<string, boolean>()
    for (const row of prefsRows || []) {
      const enabled = (row as Record<string, unknown>)[prefKey]
      prefsByUser.set(row.user_id, enabled !== false)
    }

    const notifications = targetUserIds
      .filter((userId) => prefsByUser.get(userId) ?? true)
      .map((userId) => ({
        user_id: userId,
        title,
        message,
        type: notificationType,
        data: {
          call_id: callId,
          event_type: eventType,
          customer_phone: customerPhone,
          customer_name: customerName,
        },
      }))

    if (notifications.length === 0) {
      return new Response(
        JSON.stringify({ success: true, message: "All recipients opted out of this call event" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      )
    }

    const { error: insertError } = await supabase.from("notifications").insert(notifications)
    if (insertError) throw insertError

    return new Response(JSON.stringify({ success: true, message: "Notification created" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    })
  } catch (error: any) {
    console.error("Error creating call notification:", error)
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    })
  }
})
