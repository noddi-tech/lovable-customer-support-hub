/**
 * Shared helpers for defense-in-depth email thread matching.
 *
 * Precedence used by the inbound parser (best -> fallback):
 *  1. RFC headers: In-Reply-To / References matched against stored Message-IDs
 *  2. Structured Message-ID: <conv-{conversationId}-{rand}@domain> minted on outbound
 *  3. Recipient plus-address: support+c-{conversationId}@domain
 *  4. Hidden in-body token: [ref:{conversationId}:ref]
 *  5. Subject code: [#{shortRef}] (first 8 hex chars of the conversation id)
 *  6. New conversation
 */

const UUID_RE = "[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}"

/** Short, human-facing reference (first 8 hex chars of the conversation id). */
export function shortRef(conversationId: string): string {
  return conversationId.replace(/-/g, "").slice(0, 8).toUpperCase()
}

/** Plain-text tracking token that survives quoted replies. */
export function buildBodyToken(conversationId: string): string {
  return `[ref:${conversationId}:ref]`
}

/** Invisible HTML tracking token appended to outbound emails. */
export function buildHtmlToken(conversationId: string): string {
  return `<div style="display:none;max-height:0;overflow:hidden;font-size:1px;line-height:1px;color:transparent;">${buildBodyToken(
    conversationId,
  )}</div>`
}

/** Structured Message-ID so a single header lookup identifies the thread. */
export function buildStructuredMessageId(conversationId: string, fromEmail: string): string {
  const domain = fromEmail.split("@")[1] || "mail.local"
  const rand =
    (crypto as unknown as { randomUUID?: () => string }).randomUUID?.().slice(0, 12) ||
    Math.random().toString(36).slice(2, 14)
  return `<conv-${conversationId}-${rand}@${domain}>`
}

/** Pull a conversation id out of any of our own structured Message-IDs. */
export function extractConversationIdFromMessageIds(ids: string[]): string | null {
  const re = new RegExp(`conv-(${UUID_RE})-`, "i")
  for (const id of ids) {
    const m = id?.match(re)
    if (m) return m[1].toLowerCase()
  }
  return null
}

/** Pull a conversation id out of a plus-addressed recipient (support+c-<uuid>@…). */
export function extractConversationIdFromAddress(address?: string | null): string | null {
  if (!address) return null
  const m = address.match(new RegExp(`\\+(?:c|conv|ticket)-(${UUID_RE})`, "i"))
  return m ? m[1].toLowerCase() : null
}

/** Remove a +tag from the local part so route lookups still resolve. */
export function stripPlusTag(address: string): string {
  const [local, domain] = address.split("@")
  if (!local || !domain) return address
  return `${local.split("+")[0]}@${domain}`
}

/** Find the hidden in-body token inside a (possibly quoted) email body. */
export function extractConversationIdFromBody(
  ...bodies: Array<string | null | undefined>
): string | null {
  const re = new RegExp(`\\[ref:(${UUID_RE}):ref\\]`, "i")
  for (const body of bodies) {
    if (!body) continue
    const m = body.match(re)
    if (m) return m[1].toLowerCase()
  }
  return null
}

/** Find a [#ABCD1234] style subject code (returns the lowercase short ref). */
export function extractSubjectRef(subject?: string | null): string | null {
  if (!subject) return null
  const m = subject.match(/\[#\s*([0-9a-f]{8})\s*\]/i)
  return m ? m[1].toLowerCase() : null
}
