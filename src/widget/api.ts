import type { ChatMessage, ChatSession, WidgetConfig } from "./types"

let apiBaseUrl = "https://qgfaycwsangsqzpveoup.supabase.co/functions/v1"

export function setApiUrl(url: string) {
  apiBaseUrl = url
}

export function getApiUrl(): string {
  return apiBaseUrl
}

// The proxy edge functions require callers to identify themselves; the widget
// presents its (public) widget key so the functions are not open to the world.
let widgetKey = ""

export function setWidgetKey(key: string) {
  widgetKey = key
}

export function getWidgetKey(): string {
  return widgetKey
}

// Optional brand of the host site (e.g. 'Noddi Bilpleie'). Passed through to
// the backend so agents can see which brand a chat came from.
let brand = ""

export function setBrand(value: string) {
  brand = (value || "").slice(0, 40)
}

export function getBrand(): string {
  return brand
}

// Optional list of locales the host app supports (init/update
// `supportedLocales`). When set it narrows the widget language picker.
let supportedLocales: string[] = []

export function setSupportedLocales(value: string[]) {
  supportedLocales = value
}

export function getSupportedLocales(): string[] {
  return supportedLocales
}

// Host-controlled gate for the knowledge-base / help-centre home action
// (init/update `enableKnowledgeSearch`). undefined = host has no opinion.
let hostEnableKnowledgeSearch: boolean | undefined

export function setHostEnableKnowledgeSearch(value: boolean | undefined) {
  hostEnableKnowledgeSearch = typeof value === "boolean" ? value : undefined
}

export function getHostEnableKnowledgeSearch(): boolean | undefined {
  return hostEnableKnowledgeSearch
}

/**
 * Effective help-centre visibility: host `false` always wins, host `true`
 * still requires the admin flag, host omitted keeps the admin flag alone.
 */
export function isKnowledgeSearchEnabled(adminEnabled: boolean): boolean {
  if (hostEnableKnowledgeSearch === false) return false
  return !!adminEnabled
}

// Optional extra context of the host site (locale, environment, source app,
// logged-in user, booking/order in flight, SPA pathname, release).
// Passed through to the backend and shown to agents on the conversation.
export interface WidgetContext {
  locale?: string
  environment?: string
  source_app?: string
  user_id?: string
  service_department_id?: string
  booking_id?: string
  booking_slug?: string
  order_id?: string
  license_plate?: string
  car?: string
  pathname?: string
  app_version?: string
}

const CONTEXT_LIMITS: Record<keyof WidgetContext, number> = {
  locale: 20,
  environment: 20,
  source_app: 40,
  user_id: 64,
  service_department_id: 64,
  booking_id: 64,
  booking_slug: 80,
  order_id: 64,
  license_plate: 16,
  car: 80,
  pathname: 300,
  app_version: 40,
}

let widgetContext: WidgetContext = {}

function normalizeContext(value: Partial<Record<keyof WidgetContext, unknown>> = {}) {
  const next: Record<string, string> = {}
  for (const key of Object.keys(CONTEXT_LIMITS) as (keyof WidgetContext)[]) {
    const raw = value[key]
    if (raw === undefined || raw === null || raw === "") continue
    next[key] = String(raw).trim().slice(0, CONTEXT_LIMITS[key])
  }
  return next as WidgetContext
}

export function setWidgetContext(value: Partial<Record<keyof WidgetContext, unknown>> = {}) {
  widgetContext = normalizeContext(value)
}

/** Merge new context values in mid-session (NoddiWidget('update', { context })). */
export function updateWidgetContext(value: Partial<Record<keyof WidgetContext, unknown>> = {}) {
  widgetContext = { ...widgetContext, ...normalizeContext(value) }
}

export function getWidgetContext(): WidgetContext | undefined {
  // Always report the live SPA pathname unless the host set one explicitly.
  const ctx: WidgetContext = { ...widgetContext }
  if (!ctx.pathname && typeof window !== "undefined") {
    ctx.pathname = `${window.location.pathname}${window.location.search}`.slice(0, 300)
  }
  return Object.keys(ctx).length > 0 ? ctx : undefined
}

/** Map the flat init/update options onto the wire context field names. */
export function contextFromInitOptions(options: Record<string, any> = {}): Record<string, unknown> {
  return {
    locale: options.locale,
    environment: options.environment,
    source_app: options.sourceApp ?? options.source_app,
    user_id: options.userId ?? options.user_id,
    service_department_id: options.serviceDepartmentId ?? options.service_department_id,
    booking_id: options.bookingId ?? options.booking_id,
    booking_slug: options.bookingSlug ?? options.booking_slug,
    order_id: options.orderId ?? options.order_id,
    license_plate: options.licensePlate ?? options.license_plate,
    car: options.car,
    pathname: options.pathname,
    app_version: options.appVersion ?? options.app_version,
  }
}

// ========== Identity ==========
// NoddiWidget('identify', { userId, email, name, phone }) — an *agent hint*.
// The widget key is public, so a client-supplied identity is never trusted for
// privileged actions; those stay behind phone verification.

export interface WidgetIdentity {
  user_id?: string
  email?: string
  name?: string
  phone?: string
}

const IDENTITY_LIMITS: Record<keyof WidgetIdentity, number> = {
  user_id: 64,
  email: 160,
  name: 120,
  phone: 32,
}

const IDENTITY_STORAGE_KEY = "noddi_widget_identity"

let identity: WidgetIdentity = readStoredIdentity()

function readStoredIdentity(): WidgetIdentity {
  try {
    const raw =
      typeof localStorage !== "undefined" ? localStorage.getItem(IDENTITY_STORAGE_KEY) : null
    return raw ? (JSON.parse(raw) as WidgetIdentity) : {}
  } catch {
    return {}
  }
}

export function setIdentity(value: Partial<Record<keyof WidgetIdentity, unknown>> = {}) {
  const next: Record<string, string> = {}
  for (const key of Object.keys(IDENTITY_LIMITS) as (keyof WidgetIdentity)[]) {
    const raw = value[key]
    if (raw === undefined || raw === null || raw === "") continue
    next[key] = String(raw).trim().slice(0, IDENTITY_LIMITS[key])
  }
  identity = { ...identity, ...next }
  try {
    localStorage.setItem(IDENTITY_STORAGE_KEY, JSON.stringify(identity))
  } catch {
    /* storage unavailable */
  }
}

export function getIdentity(): WidgetIdentity {
  return identity
}

export function isIdentified(): boolean {
  return Boolean(identity.email || identity.user_id)
}

export function clearIdentity() {
  identity = {}
  try {
    localStorage.removeItem(IDENTITY_STORAGE_KEY)
  } catch {
    /* storage unavailable */
  }
}

/** Headers for calls to the Noddi proxy edge functions. */
export function proxyHeaders(): Record<string, string> {
  return { "Content-Type": "application/json", "x-widget-key": widgetKey }
}

export async function fetchWidgetConfig(widgetKey: string): Promise<WidgetConfig | null> {
  try {
    const response = await fetch(`${apiBaseUrl}/widget-config?key=${encodeURIComponent(widgetKey)}`)
    if (!response.ok) {
      console.error("[Noddi Widget] Failed to fetch config:", response.status)
      return null
    }
    return await response.json()
  } catch (error) {
    console.error("[Noddi Widget] Error fetching config:", error)
    return null
  }
}

// ========== Contact Form ==========

export interface SubmitContactData {
  widgetKey: string
  name: string
  email: string
  message: string
  pageUrl: string
  visitorId?: string
  brand?: string
}

/** A contact-form message this visitor sent, kept locally so the widget can show it again. */
export interface StoredSubmission {
  conversationId?: string
  name: string
  email: string
  message: string
  sentAt: string
}

const SUBMISSIONS_KEY = "noddi_contact_submissions"

export function readStoredSubmissions(): StoredSubmission[] {
  try {
    const raw = localStorage.getItem(SUBMISSIONS_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? (parsed as StoredSubmission[]) : []
  } catch {
    return []
  }
}

export function storeSubmission(submission: StoredSubmission): void {
  try {
    const next = [submission, ...readStoredSubmissions()].slice(0, 10)
    localStorage.setItem(SUBMISSIONS_KEY, JSON.stringify(next))
  } catch {
    // storage unavailable — the message is still sent, we just can't show history
  }
}

export async function submitContactForm(
  data: SubmitContactData,
): Promise<{ success: boolean; error?: string; conversationId?: string }> {
  try {
    const response = await fetch(`${apiBaseUrl}/widget-submit`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        brand: brand || undefined,
        context: getWidgetContext(),
        identity: isIdentified() ? getIdentity() : undefined,
        ...data,
      }),
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      if (response.status >= 500 || errorData.debug_status >= 500) {
        return {
          success: false,
          error: "Service is temporarily unavailable, please try again later",
        }
      }
      return { success: false, error: errorData.error || "Failed to submit" }
    }
    const body = await response.json().catch(() => ({}))
    return { success: true, conversationId: body?.conversationId }
  } catch (error) {
    console.error("[Noddi Widget] Error submitting form:", error)
    return { success: false, error: "Something went wrong, please try again later" }
  }
}

// ========== FAQ Search ==========

export interface SearchResult {
  id: string
  question: string
  answer: string
  similarity?: number
}

export async function searchFaq(widgetKey: string, query: string): Promise<SearchResult[]> {
  try {
    const response = await fetch(`${apiBaseUrl}/widget-search-faq`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ widgetKey, query }),
    })
    if (!response.ok) return []
    const data = await response.json()
    return data.results || []
  } catch (error) {
    console.error("[Noddi Widget] Error searching:", error)
    return []
  }
}

// ========== Live Chat ==========

export interface ChatEscalation {
  /** Where the escalation came from — today always the AI assistant. */
  from: "ai"
  /** AI conversation the visitor was in, so agents can trace it. */
  conversationId?: string
  /** Plain-text transcript handed over to the human agent. */
  transcript: string
}

export interface StartChatData {
  widgetKey: string
  visitorId: string
  visitorName?: string
  visitorEmail?: string
  pageUrl?: string
  brand?: string
  escalation?: ChatEscalation
}

export async function startChat(data: StartChatData): Promise<ChatSession | null> {
  try {
    const id = getIdentity()
    const response = await fetch(`${apiBaseUrl}/widget-chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "start",
        brand: brand || undefined,
        context: getWidgetContext(),
        identity: isIdentified() ? id : undefined,
        ...data,
        // Identity doubles as the visitor name/email when the host app knows them.
        visitorName: data.visitorName || id.name || undefined,
        visitorEmail: data.visitorEmail || id.email || undefined,
      }),
    })
    if (!response.ok) return null
    return await response.json()
  } catch (error) {
    console.error("[Noddi Widget] Error starting chat:", error)
    return null
  }
}

/** Current status of a stored session, used to resume a chat after a reload. */
export async function getChatSession(sessionId: string): Promise<{
  status: string
  assignedAgentName: string | null
  messages: ChatMessage[]
} | null> {
  try {
    const response = await fetch(
      `${apiBaseUrl}/widget-chat?sessionId=${encodeURIComponent(sessionId)}`,
    )
    if (!response.ok) return null
    const data = await response.json()
    return {
      status: data.status,
      assignedAgentName: data.assignedAgentName ?? null,
      messages: data.messages || [],
    }
  } catch {
    return null
  }
}

export interface ChatAttachmentInput {
  filename: string
  mimeType: string
  /** Base64 payload without the data-url prefix. */
  data: string
}

export async function sendChatAttachment(
  sessionId: string,
  file: ChatAttachmentInput,
  caption?: string,
): Promise<{ success: boolean; error?: string }> {
  try {
    const response = await fetch(`${apiBaseUrl}/widget-chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "attachment", sessionId, file, content: caption }),
    })
    if (!response.ok) {
      const err = await response.json().catch(() => ({}))
      return { success: false, error: err.error || "Upload failed" }
    }
    return { success: true }
  } catch {
    return { success: false, error: "Upload failed" }
  }
}

/** Post-chat CSAT rating (1-5) with an optional comment. */
export async function rateChat(
  sessionId: string,
  rating: number,
  comment?: string,
  resolved?: boolean | null,
): Promise<boolean> {
  try {
    const response = await fetch(`${apiBaseUrl}/widget-chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "rate", sessionId, rating, comment, resolved }),
    })
    return response.ok
  } catch {
    return false
  }
}

/** Ask for a copy of the chat transcript by email. */
export async function emailChatTranscript(sessionId: string, email: string): Promise<boolean> {
  try {
    const response = await fetch(`${apiBaseUrl}/widget-chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "transcript", sessionId, email }),
    })
    return response.ok
  } catch {
    return false
  }
}

export async function sendChatMessage(
  sessionId: string,
  content: string,
  locale?: string,
): Promise<ChatMessage | null> {
  try {
    const response = await fetch(`${apiBaseUrl}/widget-chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "message", sessionId, content, locale }),
    })
    if (!response.ok) return null
    return await response.json()
  } catch (error) {
    console.error("[Noddi Widget] Error sending message:", error)
    return null
  }
}

export async function getChatMessages(sessionId: string, since?: string): Promise<ChatMessage[]> {
  try {
    let url = `${apiBaseUrl}/widget-chat?sessionId=${encodeURIComponent(sessionId)}`
    if (since) url += `&since=${encodeURIComponent(since)}`
    const response = await fetch(url)
    if (!response.ok) return []
    const data = await response.json()
    return data.messages || []
  } catch (error) {
    console.error("[Noddi Widget] Error getting messages:", error)
    return []
  }
}

export async function endChat(sessionId: string, resolved = false): Promise<boolean> {
  try {
    const response = await fetch(`${apiBaseUrl}/widget-chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      // `resolved` also closes the conversation in the support app.
      body: JSON.stringify({ action: "end", sessionId, resolved }),
    })
    return response.ok
  } catch (error) {
    return false
  }
}

export async function updateTypingStatus(sessionId: string, isTyping: boolean): Promise<void> {
  try {
    await fetch(`${apiBaseUrl}/widget-chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "typing", sessionId, isTyping }),
    })
  } catch {
    /* silent */
  }
}

// ========== AI Chat ==========

export async function sendAiMessage(
  widgetKey: string,
  messages: Array<{ role: string; content: string }>,
  visitorPhone?: string,
  visitorEmail?: string,
  language?: string,
): Promise<{ reply: string; conversationId?: string; messageId?: string }> {
  try {
    const response = await fetch(`${apiBaseUrl}/widget-ai-chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ widgetKey, messages, visitorPhone, visitorEmail, language }),
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      if (response.status >= 500 || errorData.debug_status >= 500) {
        throw new Error("Service is temporarily unavailable, please try again later")
      }
      throw new Error(errorData.error || "AI chat failed")
    }

    const data = await response.json()
    return {
      reply: data.reply || "Sorry, I could not generate a response.",
      conversationId: data.conversationId,
      messageId: data.messageId,
    }
  } catch (error) {
    console.error("[Noddi Widget] Error in AI chat:", error)
    throw error
  }
}

export async function streamAiMessage(
  widgetKey: string,
  messages: Array<{ role: string; content: string }>,
  visitorPhone?: string,
  visitorEmail?: string,
  language?: string,
  conversationId?: string,
  onToken?: (token: string) => void,
  onMeta?: (meta: { conversationId?: string; messageId?: string }) => void,
  isVerified?: boolean,
): Promise<void> {
  const response = await fetch(`${apiBaseUrl}/widget-ai-chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      widgetKey,
      messages,
      visitorPhone,
      visitorEmail,
      language,
      stream: true,
      conversationId,
      isVerified,
    }),
  })

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}))
    if (response.status >= 500 || errorData.debug_status >= 500) {
      throw new Error("Service is temporarily unavailable, please try again later")
    }
    throw new Error(errorData.error || "AI chat streaming failed")
  }

  const contentType = response.headers.get("content-type") || ""

  // If server didn't return SSE (e.g., error JSON), fallback
  if (!contentType.includes("text/event-stream")) {
    const data = await response.json()
    if (data.reply && onToken) onToken(data.reply)
    if (data.conversationId && onMeta) onMeta({ conversationId: data.conversationId })
    return
  }

  const reader = response.body?.getReader()
  if (!reader) throw new Error("No response body")

  const decoder = new TextDecoder()
  let buffer = ""

  while (true) {
    const { done, value } = await reader.read()
    if (done) break

    buffer += decoder.decode(value, { stream: true })

    // Process complete SSE events
    const lines = buffer.split("\n")
    buffer = lines.pop() || "" // Keep incomplete line in buffer

    for (const line of lines) {
      if (!line.startsWith("data: ")) continue
      try {
        const data = JSON.parse(line.slice(6))
        if (data.type === "token" && onToken) {
          onToken(data.content)
        } else if (data.type === "meta" && onMeta) {
          onMeta({ conversationId: data.conversationId, messageId: data.messageId })
        } else if (data.type === "done") {
          return
        }
      } catch {
        /* skip invalid JSON */
      }
    }
  }
}

// ========== Phone Verification ==========

export async function sendPhoneVerification(
  widgetKey: string,
  phoneNumber: string,
): Promise<{ success: boolean; error?: string }> {
  try {
    const response = await fetch(`${apiBaseUrl}/widget-send-verification`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ widgetKey, phoneNumber }),
    })
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      if (response.status >= 500 || errorData.debug_status >= 500) {
        return {
          success: false,
          error: "Verification is temporarily unavailable, please try again later",
        }
      }
      return { success: false, error: errorData.error || "Failed to send code" }
    }
    return { success: true }
  } catch (error) {
    console.error("[Noddi Widget] Error sending verification:", error)
    return { success: false, error: "Network error" }
  }
}

export async function verifyPhonePin(
  widgetKey: string,
  phoneNumber: string,
  pin: string,
  conversationId?: string,
): Promise<{ verified: boolean; error?: string; attemptsRemaining?: number }> {
  try {
    const response = await fetch(`${apiBaseUrl}/widget-verify-phone`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ widgetKey, phoneNumber, pin, conversationId }),
    })
    if (response.status >= 500) {
      return {
        verified: false,
        error: "Verification is temporarily unavailable, please try again later",
      }
    }
    const data = await response.json()
    return data
  } catch (error) {
    console.error("[Noddi Widget] Error verifying phone:", error)
    return { verified: false, error: "Something went wrong, please try again later" }
  }
}

// ========== Address Search ==========

export interface AddressSuggestion {
  place_id: string
  main_text?: string
  secondary_text?: string
  description?: string
}

export interface ResolvedAddress {
  id?: number
  full_address?: string
  street_name: string
  street_number?: string
  city: string
  zip_code: string
  country_code: string
  country_name: string
  is_in_delivery_area: boolean
  latitude?: number
  longitude?: number
}

export async function searchAddressSuggestions(
  widgetKey: string,
  input: string,
): Promise<AddressSuggestion[]> {
  try {
    const response = await fetch(`${apiBaseUrl}/noddi-address-lookup`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-widget-key": widgetKey || getWidgetKey() },
      body: JSON.stringify({ action: "suggestions", input }),
    })
    if (!response.ok) return []
    const data = await response.json()
    return data.suggestions || []
  } catch (error) {
    console.error("[Noddi Widget] Error searching addresses:", error)
    return []
  }
}

export async function resolveAddress(widgetKey: string, placeId: string): Promise<ResolvedAddress> {
  const response = await fetch(`${apiBaseUrl}/noddi-address-lookup`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-widget-key": widgetKey || getWidgetKey() },
    body: JSON.stringify({ action: "resolve", place_id: placeId }),
  })
  if (!response.ok) {
    if (response.status >= 500) {
      throw new Error("Address lookup is temporarily unavailable, please try again later")
    }
    throw new Error("Failed to resolve address")
  }
  const data = await response.json()
  return data.address
}

// ========== Session persistence ==========
// Keeps an open chat resumable across reloads and SPA navigations.

const SESSION_STORAGE_KEY = "noddi_chat_session"

export interface StoredChatSession {
  sessionId: string
  conversationId: string
  /** ISO timestamp of the newest message the visitor has actually seen. */
  lastSeenAt: string
}

export function storeChatSession(session: StoredChatSession | null) {
  try {
    if (!session) localStorage.removeItem(SESSION_STORAGE_KEY)
    else localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(session))
  } catch {
    /* storage unavailable */
  }
}

export function readStoredChatSession(): StoredChatSession | null {
  try {
    const raw = localStorage.getItem(SESSION_STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as StoredChatSession
    return parsed?.sessionId ? parsed : null
  } catch {
    return null
  }
}

export function markChatSessionSeen(at: string) {
  const stored = readStoredChatSession()
  if (stored) storeChatSession({ ...stored, lastSeenAt: at })
}
