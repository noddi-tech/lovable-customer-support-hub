import { createClient } from "https://esm.sh/@supabase/supabase-js@2"
import { checkRateLimit, clientIp, rateLimitResponse } from "../_shared/rate-limit.ts"
import { sanitizeWidgetContext, sanitizeWidgetIdentity } from "../_shared/widget-context.ts"

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, sentry-trace, baggage, traceparent, tracestate, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version, x-supabase-api-version, x-app-version, x-requested-with, accept, accept-profile, content-profile, prefer, range, x-region",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
}

interface WidgetSubmission {
  widgetKey: string
  name: string
  email: string
  message: string
  subject?: string
  pageUrl?: string
  brand?: string
  context?: Record<string, unknown>
  identity?: Record<string, unknown>
  visitorId?: string
  browserInfo?: Record<string, unknown>
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders })
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    })
  }

  try {
    // Abuse protection: cap submissions per IP.
    const ip = clientIp(req)
    if (!(await checkRateLimit(`widget-submit:${ip}`, 10, 300))) {
      return rateLimitResponse(corsHeaders)
    }

    const body: WidgetSubmission = await req.json()

    // --- Input validation & sanitization (never trust widget clients) ---
    const asString = (v: unknown, max: number): string =>
      typeof v === "string"
        ? v
            // biome-ignore lint/suspicious/noControlCharactersInRegex: intentional control-char strip in sanitizer
            .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, "") // control chars
            .replace(/<[^>]*>/g, "") // strip markup
            .trim()
            .slice(0, max)
        : ""

    const widgetKey = asString(body.widgetKey, 200)
    const name = asString(body.name, 120)
    const email = asString(body.email, 254).toLowerCase()
    const message = asString(body.message, 10000)
    const subject = asString(body.subject, 200) || undefined
    const visitorId = asString(body.visitorId, 100) || undefined
    const brand = asString(body.brand, 40) || undefined
    const context = sanitizeWidgetContext(body.context)
    // Host-app identity hint; informational only (the widget key is public).
    const identity = sanitizeWidgetIdentity(body.identity)
    const browserInfo =
      body.browserInfo && typeof body.browserInfo === "object" && !Array.isArray(body.browserInfo)
        ? Object.fromEntries(
            Object.entries(body.browserInfo)
              .slice(0, 20)
              .map(([k, v]) => [k.slice(0, 50), String(v).slice(0, 500)]),
          )
        : undefined

    let pageUrl: string | undefined
    if (typeof body.pageUrl === "string" && body.pageUrl.length <= 2000) {
      try {
        const parsed = new URL(body.pageUrl)
        if (parsed.protocol === "http:" || parsed.protocol === "https:") pageUrl = parsed.toString()
      } catch {
        pageUrl = undefined
      }
    }

    // Validate required fields
    if (!widgetKey || !email || !message) {
      return new Response(
        JSON.stringify({ error: "Widget key, email, and message are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      )
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      return new Response(JSON.stringify({ error: "Invalid email format" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      })
    }

    // Per-email throttle on top of the IP limit
    if (!(await checkRateLimit(`widget-submit-email:${email}`, 10, 3600))) {
      return rateLimitResponse(corsHeaders)
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Fetch widget configuration
    const { data: widgetConfig, error: configError } = await supabase
      .from("widget_configs")
      .select("id, inbox_id, organization_id")
      .eq("widget_key", widgetKey)
      .eq("is_active", true)
      .single()

    if (configError || !widgetConfig) {
      console.error("Widget config not found:", configError)
      return new Response(JSON.stringify({ error: "Widget not found or inactive" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      })
    }

    const { inbox_id, organization_id } = widgetConfig

    // Find or create customer (case-insensitive email match)
    let customerId: string
    const normalizedEmail = email.toLowerCase().trim()

    const { data: existingCustomer } = await supabase
      .from("customers")
      .select("id")
      .eq("organization_id", organization_id)
      .ilike("email", normalizedEmail)
      .maybeSingle()

    if (existingCustomer) {
      customerId = existingCustomer.id

      // Update customer name if provided
      if (name) {
        await supabase
          .from("customers")
          .update({ full_name: name, updated_at: new Date().toISOString() })
          .eq("id", customerId)
      }
    } else {
      // Create new customer
      const { data: newCustomer, error: customerError } = await supabase
        .from("customers")
        .insert({
          email: normalizedEmail,
          full_name: name || null,
          organization_id,
        })
        .select("id")
        .single()

      if (customerError) {
        // Handle race condition: unique constraint violation
        if (customerError.code === "23505") {
          const { data: raceCustomer } = await supabase
            .from("customers")
            .select("id")
            .eq("organization_id", organization_id)
            .ilike("email", normalizedEmail)
            .single()
          if (raceCustomer) {
            customerId = raceCustomer.id
          } else {
            console.error("Error finding customer after race condition:", customerError)
            return new Response(JSON.stringify({ error: "Failed to create customer" }), {
              status: 500,
              headers: { ...corsHeaders, "Content-Type": "application/json" },
            })
          }
        } else {
          console.error("Error creating customer:", customerError)
          return new Response(JSON.stringify({ error: "Failed to create customer" }), {
            status: 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          })
        }
      } else {
        customerId = newCustomer!.id
      }
    }

    // Create conversation
    const conversationSubject = subject || `Contact form submission from ${name || email}`

    const { data: conversation, error: conversationError } = await supabase
      .from("conversations")
      .insert({
        organization_id,
        inbox_id,
        customer_id: customerId,
        channel: "widget",
        subject: conversationSubject,
        preview_text: message.substring(0, 200),
        status: "open",
        priority: "normal",
        is_read: false,
        received_at: new Date().toISOString(),
        metadata: {
          source: "widget",
          page_url: pageUrl,
          brand,
          browser_info: browserInfo,
          ...(context ? { context } : {}),
          ...(identity ? { identity } : {}),
        },
      })
      .select("id")
      .single()

    if (conversationError || !conversation) {
      console.error("Error creating conversation:", conversationError)
      return new Response(JSON.stringify({ error: "Failed to create conversation" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      })
    }

    // Create message
    const { error: messageError } = await supabase.from("messages").insert({
      conversation_id: conversation.id,
      content: message,
      sender_type: "customer",
      content_type: "text",
      email_subject: conversationSubject,
    })

    if (messageError) {
      console.error("Error creating message:", messageError)
      return new Response(JSON.stringify({ error: "Failed to create message" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      })
    }

    // Create or update widget session
    if (visitorId) {
      await supabase.from("widget_sessions").upsert(
        {
          widget_config_id: widgetConfig.id,
          visitor_id: visitorId,
          visitor_email: email.toLowerCase(),
          visitor_name: name || null,
          page_url: pageUrl,
          browser_info: browserInfo,
          conversation_id: conversation.id,
        },
        {
          onConflict: "visitor_id",
          ignoreDuplicates: false,
        },
      )
    }

    return new Response(
      JSON.stringify({
        success: true,
        conversationId: conversation.id,
        message: "Your message has been received. We will get back to you soon!",
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    )
  } catch (error) {
    console.error("Error processing widget submission:", error)
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    })
  }
})
