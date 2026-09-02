import { createClient } from "https://esm.sh/@supabase/supabase-js@2"
import { resolveWidgetBrand } from "../_shared/noddi-brand-catalog.ts"
import {
  checkRateLimit as checkDurableRateLimit,
  clientIp,
  rateLimitResponse,
} from "../_shared/rate-limit.ts"
import { sanitizeWidgetContext, sanitizeWidgetIdentity } from "../_shared/widget-context.ts"

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
}

interface StartChatRequest {
  action: "start"
  widgetKey: string
  visitorId: string
  visitorName?: string
  visitorEmail?: string
  pageUrl?: string
  brand?: string
  context?: Record<string, unknown>
  identity?: Record<string, unknown>
  escalation?: { from?: string; conversationId?: string; transcript?: string }
}

interface MessageRequest {
  action: "message"
  sessionId: string
  content: string
  /** Widget UI language at the time the visitor typed the message (e.g. "nb", "en"). */
  locale?: string
}

interface EndChatRequest {
  action: "end"
  sessionId: string
  /** Visitor marked the chat as resolved — also close the conversation in the support app. */
  resolved?: boolean
}

interface TypingRequest {
  action: "typing"
  sessionId: string
  isTyping: boolean
}

interface PingRequest {
  action: "ping"
  sessionId: string
}

interface AttachmentRequest {
  action: "attachment"
  sessionId: string
  content?: string
  file: { filename: string; mimeType: string; data: string }
}

interface RateRequest {
  action: "rate"
  sessionId: string
  rating: number
  resolved?: boolean | null
  comment?: string
}

interface TranscriptRequest {
  action: "transcript"
  sessionId: string
  email: string
}

type ChatRequest =
  | StartChatRequest
  | MessageRequest
  | EndChatRequest
  | TypingRequest
  | PingRequest
  | AttachmentRequest
  | RateRequest
  | TranscriptRequest

const ATTACHMENT_BUCKET = "chat-attachments"
const MAX_ATTACHMENT_BYTES = 5 * 1024 * 1024
const ALLOWED_ATTACHMENT_TYPES = [
  "image/png",
  "image/jpeg",
  "image/gif",
  "image/webp",
  "application/pdf",
]

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
}

/** Storage-safe filename: ASCII only, no path separators. */
function safeFilename(name: string): string {
  const cleaned = (name || "file")
    .normalize("NFKD")
    .replace(/[^\x00-\x7F]/g, "")
    .replace(/[^A-Za-z0-9._-]/g, "_")
    .replace(/_{2,}/g, "_")
    .slice(0, 80)
  return cleaned.replace(/^[._-]+/, "") || "file"
}

// ========== Rate Limiting ==========
const rateLimits = new Map<string, { count: number; resetAt: number }>()

function checkRateLimit(identifier: string, limit: number, windowMs: number): boolean {
  const now = Date.now()
  const record = rateLimits.get(identifier)

  // Clean up old entries periodically
  if (rateLimits.size > 1000) {
    for (const [key, value] of rateLimits.entries()) {
      if (now > value.resetAt) {
        rateLimits.delete(key)
      }
    }
  }

  if (!record || now > record.resetAt) {
    rateLimits.set(identifier, { count: 1, resetAt: now + windowMs })
    return true
  }

  if (record.count >= limit) {
    return false
  }

  record.count++
  return true
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders })
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  const supabase = createClient(supabaseUrl, supabaseServiceKey)

  try {
    // Durable, cross-instance abuse protection per client IP.
    const ip = clientIp(req)
    const ipAllowed =
      req.method === "GET"
        ? await checkDurableRateLimit(`widget-chat-get:${ip}`, 240, 60)
        : await checkDurableRateLimit(`widget-chat-post:${ip}`, 60, 60)
    if (!ipAllowed) {
      return rateLimitResponse(corsHeaders)
    }

    // Handle GET request for polling messages
    if (req.method === "GET") {
      const url = new URL(req.url)
      const sessionId = url.searchParams.get("sessionId")
      const since = url.searchParams.get("since")

      if (!sessionId) {
        return new Response(JSON.stringify({ error: "Session ID required" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        })
      }

      // Rate limit GET requests: 60 requests per minute per session
      if (
        !checkRateLimit(`get:${sessionId}`, 60, 60000) ||
        !(await checkDurableRateLimit(`widget-chat-session:${sessionId}`, 120, 60))
      ) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded" }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        })
      }

      return await handleGetMessages(supabase, sessionId, since)
    }

    // Handle POST requests
    if (req.method !== "POST") {
      return new Response(JSON.stringify({ error: "Method not allowed" }), {
        status: 405,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      })
    }

    const body: ChatRequest = await req.json()

    switch (body.action) {
      case "start":
        return await handleStartChat(supabase, body)
      case "message":
        return await handleSendMessage(supabase, body)
      case "end":
        return await handleEndChat(supabase, body)
      case "typing":
        return await handleTyping(supabase, body)
      case "ping":
        return await handlePing(supabase, body)
      case "attachment":
        return await handleAttachment(supabase, body)
      case "rate":
        return await handleRate(supabase, body)
      case "transcript":
        return await handleTranscript(supabase, body)
      default:
        return new Response(JSON.stringify({ error: "Invalid action" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        })
    }
  } catch (error) {
    console.error("Error in widget-chat:", error)
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    })
  }
})

async function handleStartChat(supabase: any, data: StartChatRequest) {
  const { widgetKey, visitorId, visitorName, visitorEmail, pageUrl } = data
  // Optional brand of the host site (sent by the embedding frontend)
  // Always resolved against the Noddi brand catalog so we never store a raw host.
  const requestedBrand =
    typeof data.brand === "string" ? data.brand.trim().slice(0, 40) || undefined : undefined
  const brand = await resolveWidgetBrand(requestedBrand, pageUrl)
  // Optional extra host-site context (locale, environment, source app, ids...)
  const context = sanitizeWidgetContext(data.context)
  // Host-app identity hint — informational only, never an authorization signal.
  const identity = sanitizeWidgetIdentity(data.identity)
  const effectiveName = visitorName || identity?.name
  const effectiveEmail = (visitorEmail || identity?.email)?.toLowerCase()

  // Validate required fields
  if (!widgetKey || !visitorId) {
    return new Response(JSON.stringify({ error: "Widget key and visitor ID are required" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    })
  }

  // Fetch widget configuration
  const { data: widgetConfig, error: configError } = await supabase
    .from("widget_configs")
    .select("id, inbox_id, organization_id, enable_chat")
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

  if (!widgetConfig.enable_chat) {
    return new Response(JSON.stringify({ error: "Live chat is not enabled for this widget" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    })
  }

  // Check for existing active/waiting session for this visitor
  // This prevents duplicate sessions when visitor refreshes or re-enters chat
  const { data: existingSession, error: existingError } = await supabase
    .from("widget_chat_sessions")
    .select("id, conversation_id, status, started_at, assigned_agent_id")
    .eq("visitor_id", visitorId)
    .eq("widget_config_id", widgetConfig.id)
    .in("status", ["waiting", "active"])
    .order("started_at", { ascending: false })
    .limit(1)
    .maybeSingle()

  if (!existingError && existingSession) {
    // Get agent name if assigned
    let agentName: string | null = null
    if (existingSession.assigned_agent_id) {
      const { data: agent } = await supabase
        .from("profiles")
        .select("full_name")
        .eq("id", existingSession.assigned_agent_id)
        .single()
      if (agent) {
        agentName = agent.full_name
      }
    }

    console.log("Returning existing session for visitor:", visitorId)
    return new Response(
      JSON.stringify({
        id: existingSession.id,
        conversationId: existingSession.conversation_id,
        status: existingSession.status,
        startedAt: existingSession.started_at,
        assignedAgentName: agentName,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    )
  }

  const { inbox_id, organization_id } = widgetConfig

  // Find or create customer
  let customerId: string | null = null

  if (effectiveEmail) {
    const { data: existingCustomer } = await supabase
      .from("customers")
      .select("id")
      .eq("email", effectiveEmail)
      .eq("organization_id", organization_id)
      .single()

    if (existingCustomer) {
      customerId = existingCustomer.id

      // Update customer name if provided
      if (effectiveName) {
        await supabase
          .from("customers")
          .update({ full_name: effectiveName, updated_at: new Date().toISOString() })
          .eq("id", customerId)
      }
    } else {
      // Create new customer
      const { data: newCustomer, error: customerError } = await supabase
        .from("customers")
        .insert({
          email: effectiveEmail,
          full_name: effectiveName || null,
          organization_id,
        })
        .select("id")
        .single()

      if (!customerError && newCustomer) {
        customerId = newCustomer.id
      }
    }
  }

  // Create conversation
  const { data: conversation, error: conversationError } = await supabase
    .from("conversations")
    .insert({
      organization_id,
      inbox_id,
      customer_id: customerId,
      channel: "widget",
      subject: `Live chat from ${effectiveName || effectiveEmail || "Visitor"}`,
      preview_text: "Chat started...",
      status: "open",
      priority: "normal",
      is_read: false,
      received_at: new Date().toISOString(),
      metadata: {
        source: "widget_chat",
        page_url: pageUrl,
        brand,
        visitor_id: visitorId,
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

  // Create chat session
  const { data: chatSession, error: sessionError } = await supabase
    .from("widget_chat_sessions")
    .insert({
      conversation_id: conversation.id,
      widget_config_id: widgetConfig.id,
      visitor_id: visitorId,
      visitor_name: effectiveName,
      visitor_email: effectiveEmail,
      status: "waiting",
      metadata: {
        page_url: pageUrl,
        brand,
        ...(context ? { context } : {}),
        ...(identity ? { identity } : {}),
      },
    })
    .select("id, status, started_at")
    .single()

  if (sessionError || !chatSession) {
    console.error("Error creating chat session:", sessionError)
    return new Response(JSON.stringify({ error: "Failed to create chat session" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    })
  }

  // Carry the AI conversation over so the agent sees the full history.
  const transcript =
    typeof data.escalation?.transcript === "string"
      ? data.escalation.transcript.slice(0, 8000).trim()
      : ""
  if (transcript) {
    await supabase.from("messages").insert({
      conversation_id: conversation.id,
      content: `Handed over from the AI assistant:\n\n${transcript}`,
      sender_type: "system",
      content_type: "text",
      is_internal: true,
    })
  }

  return new Response(
    JSON.stringify({
      id: chatSession.id,
      conversationId: conversation.id,
      status: chatSession.status,
      startedAt: chatSession.started_at,
    }),
    { headers: { ...corsHeaders, "Content-Type": "application/json" } },
  )
}

async function handleSendMessage(supabase: any, data: MessageRequest) {
  const { sessionId, content } = data
  // Widget UI language for this message — lets agents see language switches mid-chat.
  const locale =
    typeof data.locale === "string" &&
    /^[a-zA-Z]{2}([-_][a-zA-Z0-9]{2,8})?$/.test(data.locale.trim())
      ? data.locale.trim().toLowerCase()
      : undefined

  if (!sessionId || !content?.trim()) {
    return new Response(JSON.stringify({ error: "Session ID and content are required" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    })
  }

  // Get session with visitor_id for rate limiting
  const { data: session, error: sessionError } = await supabase
    .from("widget_chat_sessions")
    .select("id, conversation_id, status, visitor_id, metadata")
    .eq("id", sessionId)
    .single()

  if (sessionError || !session) {
    return new Response(JSON.stringify({ error: "Session not found" }), {
      status: 404,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    })
  }

  if (session.status === "ended" || session.status === "abandoned") {
    return new Response(JSON.stringify({ error: "Chat session has ended" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    })
  }

  // Rate limit messages: 30 messages per minute per visitor
  if (
    !checkRateLimit(`msg:${session.visitor_id}`, 30, 60000) ||
    !(await checkDurableRateLimit(`widget-chat-msg:${session.visitor_id}`, 30, 60))
  ) {
    return new Response(JSON.stringify({ error: "Rate limit exceeded. Please slow down." }), {
      status: 429,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    })
  }

  // Sanitize content (basic HTML escape)
  const sanitizedContent = content
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .trim()

  // Create message
  const { data: message, error: messageError } = await supabase
    .from("messages")
    .insert({
      conversation_id: session.conversation_id,
      content: sanitizedContent,
      sender_type: "customer",
      content_type: "text",
      ...(locale ? { metadata: { locale } } : {}),
    })
    .select("id, content, sender_type, created_at")
    .single()

  if (messageError || !message) {
    console.error("Error creating message:", messageError)
    return new Response(JSON.stringify({ error: "Failed to send message" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    })
  }

  // Update session last_message_at and conversation preview
  const sessionMeta = (session.metadata || {}) as Record<string, unknown>
  const sessionContext = (sessionMeta.context || {}) as Record<string, unknown>
  const sessionUpdate: Record<string, unknown> = { last_message_at: new Date().toISOString() }
  if (locale && sessionContext.locale !== locale) {
    sessionUpdate.metadata = { ...sessionMeta, context: { ...sessionContext, locale } }
  }

  await Promise.all([
    supabase.from("widget_chat_sessions").update(sessionUpdate).eq("id", sessionId),
    supabase
      .from("conversations")
      .update({
        preview_text: sanitizedContent.substring(0, 200),
        updated_at: new Date().toISOString(),
        status: "open",
        is_read: false,
      })
      .eq("id", session.conversation_id),
  ])

  // Clear typing indicator
  await supabase
    .from("chat_typing_indicators")
    .delete()
    .eq("conversation_id", session.conversation_id)
    .not("user_id", "is", null)

  return new Response(
    JSON.stringify({
      id: message.id,
      content: message.content,
      senderType: message.sender_type,
      createdAt: message.created_at,
    }),
    { headers: { ...corsHeaders, "Content-Type": "application/json" } },
  )
}

async function handleGetMessages(supabase: any, sessionId: string, since: string | null) {
  // Get session
  const { data: session, error: sessionError } = await supabase
    .from("widget_chat_sessions")
    .select("conversation_id, status, assigned_agent_id")
    .eq("id", sessionId)
    .single()

  if (sessionError || !session) {
    return new Response(JSON.stringify({ error: "Session not found" }), {
      status: 404,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    })
  }

  // Fetch messages
  let query = supabase
    .from("messages")
    .select("id, content, sender_type, created_at, sender_id, attachments, is_internal")
    .eq("conversation_id", session.conversation_id)
    .order("created_at", { ascending: true })

  if (since) {
    query = query.gt("created_at", since)
  }

  const { data: messages, error: messagesError } = await query

  if (messagesError) {
    console.error("Error fetching messages:", messagesError)
    return new Response(JSON.stringify({ error: "Failed to fetch messages" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    })
  }

  // Get agent name if assigned
  let agentName: string | null = null
  if (session.assigned_agent_id) {
    const { data: agent } = await supabase
      .from("profiles")
      .select("full_name")
      .eq("id", session.assigned_agent_id)
      .single()

    if (agent) {
      agentName = agent.full_name
    }
  }

  // Check for agent typing
  const { data: typing } = await supabase
    .from("chat_typing_indicators")
    .select("is_typing")
    .eq("conversation_id", session.conversation_id)
    .not("user_id", "is", null)
    .eq("is_typing", true)
    .maybeSingle()

  // Update last_seen_at
  await supabase
    .from("widget_chat_sessions")
    .update({ last_seen_at: new Date().toISOString() })
    .eq("id", sessionId)

  // Internal notes and system handover notes never reach the visitor.
  const visible = (messages || []).filter(
    (m: any) => !m.is_internal && (m.sender_type === "customer" || m.sender_type === "agent"),
  )

  // Signed URLs expire, so re-sign attachments on every read.
  const withAttachments = await Promise.all(
    visible.map(async (m: any) => {
      const raw = Array.isArray(m.attachments) ? m.attachments : []
      const attachments = [] as Array<{ url: string; name: string; type: string }>
      for (const att of raw) {
        const path = att?.storagePath || att?.storage_path
        let url: string | null = null
        if (path) {
          const { data: signed } = await supabase.storage
            .from(att?.bucket || ATTACHMENT_BUCKET)
            .createSignedUrl(path, 3600)
          url = signed?.signedUrl ?? null
        }
        // Agent-side uploads may only carry a URL (already-signed or public).
        if (!url && typeof att?.url === "string" && att.url.startsWith("http")) {
          url = att.url
        }
        if (url) {
          attachments.push({ url, name: att.name || "file", type: att.type || "" })
        }
      }
      return {
        id: m.id,
        content: m.content,
        senderType: m.sender_type,
        createdAt: m.created_at,
        senderName: m.sender_type === "agent" ? agentName : undefined,
        ...(attachments.length > 0 ? { attachments } : {}),
      }
    }),
  )

  return new Response(
    JSON.stringify({
      messages: withAttachments,
      status: session.status,
      agentTyping: typing?.is_typing || false,
      assignedAgentName: agentName,
    }),
    { headers: { ...corsHeaders, "Content-Type": "application/json" } },
  )
}

async function handleEndChat(supabase: any, data: EndChatRequest) {
  const { sessionId, resolved } = data

  if (!sessionId) {
    return new Response(JSON.stringify({ error: "Session ID required" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    })
  }

  const { data: session } = await supabase
    .from("widget_chat_sessions")
    .select("conversation_id")
    .eq("id", sessionId)
    .single()

  const { error } = await supabase
    .from("widget_chat_sessions")
    .update({
      status: "ended",
      ended_at: new Date().toISOString(),
    })
    .eq("id", sessionId)

  if (error) {
    console.error("Error ending chat:", error)
    return new Response(JSON.stringify({ error: "Failed to end chat" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    })
  }

  // The visitor said the issue is solved — close the thread for the agents too.
  if (resolved && session?.conversation_id) {
    const { error: closeError } = await supabase
      .from("conversations")
      .update({ status: "closed", updated_at: new Date().toISOString() })
      .eq("id", session.conversation_id)
    if (closeError) console.error("Error closing conversation after visitor resolve:", closeError)
  }

  return new Response(JSON.stringify({ success: true, resolved: !!resolved }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  })
}

async function handleTyping(supabase: any, data: TypingRequest) {
  const { sessionId, isTyping } = data

  if (!sessionId) {
    return new Response(JSON.stringify({ error: "Session ID required" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    })
  }

  // Get session to get conversation_id and visitor_id
  const { data: session } = await supabase
    .from("widget_chat_sessions")
    .select("conversation_id, visitor_id")
    .eq("id", sessionId)
    .single()

  if (!session) {
    return new Response(JSON.stringify({ error: "Session not found" }), {
      status: 404,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    })
  }

  // Upsert typing indicator
  await supabase.from("chat_typing_indicators").upsert(
    {
      conversation_id: session.conversation_id,
      visitor_id: session.visitor_id,
      is_typing: isTyping,
      updated_at: new Date().toISOString(),
    },
    {
      onConflict: "conversation_id,visitor_id",
    },
  )

  return new Response(JSON.stringify({ success: true }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  })
}

async function handlePing(supabase: any, data: PingRequest) {
  const { sessionId } = data

  if (!sessionId) {
    return new Response(JSON.stringify({ error: "Session ID required" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    })
  }

  // Update last_seen_at to indicate visitor is still active
  const { error } = await supabase
    .from("widget_chat_sessions")
    .update({ last_seen_at: new Date().toISOString() })
    .eq("id", sessionId)
    .in("status", ["waiting", "active"])

  if (error) {
    console.error("Error updating ping:", error)
  }

  return new Response(JSON.stringify({ success: true }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  })
}

async function loadSession(supabase: any, sessionId: string) {
  const { data } = await supabase
    .from("widget_chat_sessions")
    .select("id, conversation_id, status, visitor_id, visitor_email, visitor_name, metadata")
    .eq("id", sessionId)
    .maybeSingle()
  return data
}

async function handleAttachment(supabase: any, data: AttachmentRequest) {
  const { sessionId, file } = data

  if (!sessionId || !file?.data || !file?.filename) {
    return new Response(JSON.stringify({ error: "Session ID and file are required" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    })
  }

  if (!ALLOWED_ATTACHMENT_TYPES.includes(file.mimeType)) {
    return new Response(JSON.stringify({ error: "Unsupported file type" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    })
  }

  const session = await loadSession(supabase, sessionId)
  if (!session) {
    return new Response(JSON.stringify({ error: "Session not found" }), {
      status: 404,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    })
  }
  if (session.status === "ended" || session.status === "abandoned") {
    return new Response(JSON.stringify({ error: "Chat session has ended" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    })
  }

  // Uploads are far more expensive than messages: 10 per visitor per minute.
  if (
    !checkRateLimit(`att:${session.visitor_id}`, 10, 60000) ||
    !(await checkDurableRateLimit(`widget-chat-att:${session.visitor_id}`, 10, 60))
  ) {
    return new Response(JSON.stringify({ error: "Too many uploads. Please slow down." }), {
      status: 429,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    })
  }

  let bytes: Uint8Array
  try {
    const binary = atob(file.data)
    bytes = new Uint8Array(binary.length)
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
  } catch {
    return new Response(JSON.stringify({ error: "Invalid file payload" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    })
  }

  if (bytes.byteLength > MAX_ATTACHMENT_BYTES) {
    return new Response(JSON.stringify({ error: "File is larger than 5 MB" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    })
  }

  const path = `${session.conversation_id}/${Date.now()}-${safeFilename(file.filename)}`
  const { error: uploadError } = await supabase.storage
    .from(ATTACHMENT_BUCKET)
    .upload(path, bytes, { contentType: file.mimeType, upsert: false })

  if (uploadError) {
    console.error("Error uploading widget attachment:", uploadError)
    return new Response(JSON.stringify({ error: "Failed to upload file" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    })
  }

  const caption = typeof data.content === "string" ? data.content.trim().slice(0, 500) : ""
  const { error: messageError } = await supabase.from("messages").insert({
    conversation_id: session.conversation_id,
    content: caption || `📎 ${file.filename}`,
    sender_type: "customer",
    content_type: "text",
    attachments: [{ name: file.filename, type: file.mimeType, storagePath: path }],
  })

  if (messageError) {
    console.error("Error saving attachment message:", messageError)
    return new Response(JSON.stringify({ error: "Failed to attach file" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    })
  }

  await Promise.all([
    supabase
      .from("widget_chat_sessions")
      .update({ last_message_at: new Date().toISOString() })
      .eq("id", sessionId),
    supabase
      .from("conversations")
      .update({
        preview_text: `📎 ${file.filename}`.substring(0, 200),
        updated_at: new Date().toISOString(),
        status: "open",
        is_read: false,
      })
      .eq("id", session.conversation_id),
  ])

  return new Response(JSON.stringify({ success: true }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  })
}

async function handleRate(supabase: any, data: RateRequest) {
  const { sessionId } = data
  const rating = Number(data.rating)

  if (!sessionId || !Number.isInteger(rating) || rating < 1 || rating > 5) {
    return new Response(
      JSON.stringify({ error: "A session ID and a rating between 1 and 5 are required" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    )
  }

  const session = await loadSession(supabase, sessionId)
  if (!session) {
    return new Response(JSON.stringify({ error: "Session not found" }), {
      status: 404,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    })
  }

  const comment =
    typeof data.comment === "string"
      ? data.comment
          .replace(/<[^>]*>/g, "")
          .trim()
          .slice(0, 500)
      : ""

  const resolved = typeof data.resolved === "boolean" ? data.resolved : null

  const csat = {
    rating,
    comment: comment || undefined,
    resolved,
    rated_at: new Date().toISOString(),
  }

  await supabase
    .from("widget_chat_sessions")
    .update({ metadata: { ...(session.metadata || {}), csat } })
    .eq("id", sessionId)

  // Visible to agents in the thread so feedback is not buried in metadata.
  await supabase.from("messages").insert({
    conversation_id: session.conversation_id,
    content: `Chat rating: ${rating}/5${
      resolved === null ? "" : ` · Problem ${resolved ? "solved" : "not solved"}`
    }${comment ? `\n\n"${comment}"` : ""}`,
    sender_type: "system",
    content_type: "text",
    is_internal: true,
  })

  return new Response(JSON.stringify({ success: true }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  })
}

async function handleTranscript(supabase: any, data: TranscriptRequest) {
  const { sessionId } = data
  const email = typeof data.email === "string" ? data.email.trim().toLowerCase() : ""

  if (!sessionId || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return new Response(JSON.stringify({ error: "A session ID and a valid email are required" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    })
  }

  // Transcript emails are a spam vector: 3 per visitor per hour.
  if (!(await checkDurableRateLimit(`widget-chat-transcript:${sessionId}`, 3, 3600))) {
    return rateLimitResponse(corsHeaders)
  }

  const session = await loadSession(supabase, sessionId)
  if (!session) {
    return new Response(JSON.stringify({ error: "Session not found" }), {
      status: 404,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    })
  }

  // Only send to the address already tied to the session, when there is one —
  // otherwise anyone holding a session id could mail the transcript anywhere.
  if (session.visitor_email && session.visitor_email !== email) {
    return new Response(
      JSON.stringify({ error: "Transcript can only be sent to the email used for this chat" }),
      { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    )
  }

  const { data: messages } = await supabase
    .from("messages")
    .select("content, sender_type, created_at, is_internal")
    .eq("conversation_id", session.conversation_id)
    .order("created_at", { ascending: true })

  const rows = (messages || [])
    .filter(
      (m: any) => !m.is_internal && (m.sender_type === "customer" || m.sender_type === "agent"),
    )
    .map((m: any) => {
      const who = m.sender_type === "customer" ? "You" : "Support"
      const when = new Date(m.created_at).toLocaleString("en-GB", { timeZone: "Europe/Oslo" })
      return `<p style="margin:0 0 12px"><strong>${escapeHtml(who)}</strong> <span style="color:#888">${escapeHtml(when)}</span><br>${escapeHtml(m.content || "")}</p>`
    })
    .join("")

  const html = `<h2 style="margin:0 0 16px;font-size:18px;">Your chat transcript</h2>
    ${rows || "<p>No messages were exchanged.</p>"}`

  // Brand the transcript like every other outgoing email (header + company footer).
  const brand =
    (session.metadata?.context?.brand as string | undefined) ||
    (session.metadata?.brand as string | undefined) ||
    null

  const { data: sendResult, error: sendError } = await supabase.functions.invoke("send-email", {
    body: {
      to: email,
      subject: "Your chat transcript",
      html,
      brand,
      preheader: "A copy of your chat with support",
    },
  })

  if (sendError || sendResult?.error) {
    console.error("Error sending transcript:", sendError || sendResult?.error)
    return new Response(JSON.stringify({ error: "Failed to send transcript" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    })
  }

  return new Response(JSON.stringify({ success: true }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  })
}
