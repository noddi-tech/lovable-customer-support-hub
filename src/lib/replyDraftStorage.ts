/** Per-conversation reply composer drafts. Survives navigation within the tab. */

const PREFIX = "support-hub:reply-draft:"

export type ReplyDraft = {
  text: string
  updatedAt: number
}

function key(conversationId: string): string {
  return `${PREFIX}${conversationId}`
}

export function loadReplyDraft(conversationId: string | null | undefined): string {
  if (!conversationId || typeof window === "undefined") return ""
  try {
    const raw = sessionStorage.getItem(key(conversationId))
    if (!raw) return ""
    const parsed = JSON.parse(raw) as ReplyDraft
    return typeof parsed?.text === "string" ? parsed.text : ""
  } catch {
    return ""
  }
}

export function saveReplyDraft(conversationId: string | null | undefined, text: string): void {
  if (!conversationId || typeof window === "undefined") return
  try {
    const trimmed = text // preserve intentional whitespace while typing
    if (!trimmed.trim()) {
      sessionStorage.removeItem(key(conversationId))
      return
    }
    const draft: ReplyDraft = { text: trimmed, updatedAt: Date.now() }
    sessionStorage.setItem(key(conversationId), JSON.stringify(draft))
  } catch {
    /* quota / private mode — ignore */
  }
}

export function clearReplyDraft(conversationId: string | null | undefined): void {
  if (!conversationId || typeof window === "undefined") return
  try {
    sessionStorage.removeItem(key(conversationId))
  } catch {
    /* ignore */
  }
}
