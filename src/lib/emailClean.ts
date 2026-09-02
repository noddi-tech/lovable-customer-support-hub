/**
 * Library-backed email body cleaner ("clean v2").
 *
 * Layers, in order:
 *   1. HTML  -> @u22n/mailtools parseMessage (quotations + signatures + remote content)
 *   2. Text  -> built-in reply stripper (visible turn only, browser-safe)
 *   3. Norwegian / Outlook second pass (Fra:/Sendt:, "Den ... skrev:") — the
 *      libraries do not cover these reliably.
 *   4. Safety net: never return an (almost) empty body when the original had content.
 *   5. Always DOMPurify the HTML result.
 *
 * Nothing is deleted from the stored row — `removed` powers the existing
 * "show trimmed content" expander.
 */

import { parseMessage } from "@u22n/mailtools"
import { ENABLE_LIB_EMAIL_CLEAN } from "@/lib/parseQuotedEmail"
import { sanitizeEmailHTML } from "@/utils/htmlSanitizer"
import { logger } from "@/utils/logger"

export type CleanConfidence = "high" | "low"

export interface CleanResult {
  /** Cleaned body (HTML when the input was HTML, plain text otherwise) */
  visible: string
  /** What was stripped, for the "show trimmed content" toggle */
  removed: string
  confidence: CleanConfidence
  /** True when the library pipeline actually ran and changed something */
  cleaned: boolean
}

/** Minimum length a cleaned body must keep before we treat it as a bad strip. */
const MIN_VISIBLE_LENGTH = 15

// ---------------------------------------------------------------------------
// Feature flag
// ---------------------------------------------------------------------------

let overrideCache: boolean | null | undefined

/**
 * Flag + per-session override so real threads can be compared side by side:
 *   ?cleanv2=1  -> on   (sticky for the session)
 *   ?cleanv2=0  -> off  (sticky for the session)
 */
export function isLibCleanEnabled(): boolean {
  if (overrideCache === undefined) {
    overrideCache = null
    try {
      if (typeof window !== "undefined") {
        const param = new URLSearchParams(window.location.search).get("cleanv2")
        if (param === "1" || param === "0") {
          overrideCache = param === "1"
          window.sessionStorage.setItem("cleanv2", param)
        } else {
          const stored = window.sessionStorage.getItem("cleanv2")
          if (stored === "1" || stored === "0") overrideCache = stored === "1"
        }
      }
    } catch {
      overrideCache = null
    }
  }
  return overrideCache ?? ENABLE_LIB_EMAIL_CLEAN
}

/** Test helper — clears the memoised URL/sessionStorage override. */
export function resetLibCleanOverride(): void {
  overrideCache = undefined
}

// ---------------------------------------------------------------------------
// Norwegian / Outlook second pass
// ---------------------------------------------------------------------------

const NB_REPLY_MARKERS: RegExp[] = [
  /^\s*(Den|På)\s.+\sskrev\s.+:\s*$/im,
  /^\s*On\s.+\swrote:\s*$/im,
  /^\s*-{2,}\s*(Opprinnelig melding|Original Message|Videresendt melding|Forwarded message)\s*-{2,}\s*$/im,
  /^\s*(Fra|From):\s*.+$/im,
  /^\s*(Sendt fra|Sent from) (min|my) .+$/im,
  /^\s*(Get|Hent) Outlook for .+$/im,
]

/**
 * Cut plain text at the first Norwegian/Outlook reply or signature marker.
 * The `Fra:`/`From:` marker only counts when a `Sendt:`/`Sent:`/`Til:`/`To:`
 * line follows within a few lines — otherwise it is ordinary prose.
 */
export function cutAtScandinavianMarkers(text: string): { visible: string; removed: string } {
  if (!text) return { visible: "", removed: "" }
  const lines = text.split("\n")

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    for (const marker of NB_REPLY_MARKERS) {
      if (!new RegExp(marker.source, marker.flags.replace("m", "")).test(line.trim())) continue

      // "Fra:/From:" needs a corroborating header line right after it.
      if (/^\s*(Fra|From):/i.test(line)) {
        const lookahead = lines.slice(i + 1, i + 4).join("\n")
        if (!/^\s*(Sendt|Sent|Dato|Date|Til|To|Emne|Subject):/im.test(lookahead)) continue
      }

      return {
        visible: lines.slice(0, i).join("\n").trim(),
        removed: lines.slice(i).join("\n").trim(),
      }
    }
  }
  return { visible: text.trim(), removed: "" }
}

// ---------------------------------------------------------------------------
// Plain text (synchronous)
// ---------------------------------------------------------------------------

/**
 * Clean a plain-text body: visible turn only, quotes and signatures removed.
 * Synchronous — safe to call from normalizeMessage and list previews.
 */
/**
 * Browser-safe reply stripper: cuts at the first quote/reply marker.
 * Replaces `email-reply-parser`, which is Node-only (uses `createRequire`).
 */
const REPLY_CUT_PATTERNS: RegExp[] = [
  /^\s*-{2,}\s*Original Message\s*-{2,}\s*$/i,
  /^\s*-{2,}\s*Opprinnelig melding\s*-{2,}\s*$/i,
  /^\s*_{10,}\s*$/,
  /^\s*On\b.{0,200}\bwrote:\s*$/i,
  /^\s*.{0,120}\bwrote:\s*$/i,
  /^\s*>/,
]

function stripPlainTextReply(text: string): string {
  const lines = text.split("\n")
  for (let i = 0; i < lines.length; i++) {
    if (REPLY_CUT_PATTERNS.some((re) => re.test(lines[i]))) {
      const head = lines.slice(0, i).join("\n").trim()
      if (head.length >= MIN_VISIBLE_LENGTH) return head
      return text.trim()
    }
  }
  return text.trim()
}

export function cleanPlainTextBody(text: string): CleanResult {
  const source = (text ?? "").trim()
  if (!source || !isLibCleanEnabled()) {
    return { visible: source, removed: "", confidence: "high", cleaned: false }
  }

  let visible = source
  try {
    visible = stripPlainTextReply(source)
  } catch (error) {
    logger.debug(
      "plain-text reply strip failed, keeping original",
      { error: String(error) },
      "EmailClean",
    )
    visible = source
  }

  const scandinavian = cutAtScandinavianMarkers(visible)
  if (scandinavian.visible) visible = scandinavian.visible

  // Safety net: a strip that empties a real message is a bad strip.
  if (visible.length < MIN_VISIBLE_LENGTH && source.length >= MIN_VISIBLE_LENGTH) {
    logger.debug(
      "Clean v2 produced an (almost) empty body — falling back",
      {
        originalLength: source.length,
        cleanedLength: visible.length,
      },
      "EmailClean",
    )
    return { visible: source, removed: "", confidence: "low", cleaned: false }
  }

  const removed = source.startsWith(visible) ? source.slice(visible.length).trim() : ""
  return { visible, removed, confidence: "high", cleaned: visible !== source }
}

// ---------------------------------------------------------------------------
// HTML (asynchronous — mailtools parseMessage is async)
// ---------------------------------------------------------------------------

const htmlCache = new Map<string, CleanResult>()
const HTML_CACHE_MAX = 200

function cacheKey(html: string): string {
  let hash = 0
  for (let i = 0; i < Math.min(html.length, 2000); i++) {
    hash = ((hash << 5) - hash + html.charCodeAt(i)) | 0
  }
  return `${hash}_${html.length}`
}

function textLength(html: string): number {
  if (typeof document === "undefined") return html.replace(/<[^>]+>/g, "").trim().length
  const el = document.createElement("div")
  el.innerHTML = html
  return (el.textContent || "").trim().length
}

/**
 * Clean an HTML body with @u22n/mailtools, then sanitize with DOMPurify.
 * Results are cached by content hash — the libraries are heavier than regexes.
 */
export async function cleanEmailHtml(html: string): Promise<CleanResult> {
  const source = html ?? ""
  if (!source.trim() || !isLibCleanEnabled()) {
    return { visible: source, removed: "", confidence: "high", cleaned: false }
  }

  const key = cacheKey(source)
  const hit = htmlCache.get(key)
  if (hit) return hit

  let result: CleanResult
  try {
    // Inline attachments use cid: URIs, which DOMPurify's URI allow-list drops.
    // Park them behind a harmless https placeholder across the clean pass and
    // restore them afterwards so the existing inline-image rewriter still works.
    const parked = source.replace(/(["'])cid:/gi, "$1https://cid.invalid/")

    const parsed = await parseMessage(parked, {
      cleanQuotations: true,
      cleanSignatures: true,
      // Remote content blocking is already handled downstream by
      // sanitizeEmailHTML + the "load images" control — don't double-block.
      noRemoteContent: false,
      cleanStyles: false,
    })

    const cleanedHtml = sanitizeEmailHTML(parsed.parsedMessageHtml || "").replace(
      /(["'])https:\/\/cid\.invalid\//gi,
      "$1cid:",
    )
    const originalTextLength = textLength(source)
    const cleanedTextLength = textLength(cleanedHtml)

    if (cleanedTextLength < MIN_VISIBLE_LENGTH && originalTextLength >= MIN_VISIBLE_LENGTH) {
      logger.debug(
        "Clean v2 emptied an HTML body — falling back to original",
        {
          originalTextLength,
          cleanedTextLength,
        },
        "EmailClean",
      )
      result = { visible: source, removed: "", confidence: "low", cleaned: false }
    } else {
      result = {
        visible: cleanedHtml,
        removed: parsed.foundSignatureHtml || "",
        confidence: "high",
        cleaned: Boolean(parsed.didFindQuotation || parsed.didFindSignature),
      }
    }
  } catch (error) {
    logger.debug(
      "mailtools parseMessage failed, keeping original HTML",
      { error: String(error) },
      "EmailClean",
    )
    result = { visible: source, removed: "", confidence: "low", cleaned: false }
  }

  if (htmlCache.size >= HTML_CACHE_MAX) {
    const oldest = htmlCache.keys().next().value
    if (oldest !== undefined) htmlCache.delete(oldest)
  }
  htmlCache.set(key, result)
  return result
}

/** Test helper */
export function clearEmailCleanCache(): void {
  htmlCache.clear()
}
