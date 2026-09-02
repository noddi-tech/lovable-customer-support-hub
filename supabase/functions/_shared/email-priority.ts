/**
 * RFC 2156/4021 email importance handling.
 *
 * Three headers travel with SMTP mail and mean the same thing:
 *   Importance:        High | Normal | Low   (the modern, standard one)
 *   X-Priority:        1 (Highest) … 5 (Lowest)
 *   X-MSMail-Priority: High | Normal | Low   (Outlook mirror)
 *
 * Receivers should prefer Importance and fall back to X-Priority.
 * Senders should emit all three so every client (Outlook, Gmail, Apple Mail)
 * picks it up.
 */

export type EmailPriority = "high" | "normal" | "low"

function headerValue(headersRaw: string | null | undefined, name: string): string | null {
  if (!headersRaw) return null
  const regex = new RegExp(`^${name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}:\\s*(.*)$`, "im")
  const m = headersRaw.match(regex)
  return m ? m[1].trim() : null
}

/** Read the priority out of a raw header blob. Returns 'normal' when unset/unknown. */
export function parseEmailPriority(headersRaw: string | null | undefined): EmailPriority {
  if (!headersRaw) return "normal"

  const importance = (headerValue(headersRaw, "Importance") || "").toLowerCase()
  if (importance.startsWith("high") || importance.startsWith("urgent")) return "high"
  if (importance.startsWith("low") || importance.startsWith("non-urgent")) return "low"

  const xPriority = headerValue(headersRaw, "X-Priority") || headerValue(headersRaw, "Priority")
  if (xPriority) {
    const num = parseInt(xPriority.trim(), 10)
    if (!Number.isNaN(num)) {
      if (num <= 2) return "high"
      if (num >= 4) return "low"
      return "normal"
    }
    const word = xPriority.toLowerCase()
    if (word.includes("high") || word.includes("urgent")) return "high"
    if (word.includes("low") || word.includes("non-urgent")) return "low"
  }

  const msMail = (headerValue(headersRaw, "X-MSMail-Priority") || "").toLowerCase()
  if (msMail.includes("high")) return "high"
  if (msMail.includes("low")) return "low"

  return "normal"
}

/** Headers to attach to an outgoing message so all mail clients see the priority. */
export function buildPriorityHeaders(
  priority: EmailPriority | null | undefined,
): Record<string, string> {
  if (priority === "high") {
    return {
      Importance: "High",
      "X-Priority": "1 (Highest)",
      "X-MSMail-Priority": "High",
    }
  }
  if (priority === "low") {
    return {
      Importance: "Low",
      "X-Priority": "5 (Lowest)",
      "X-MSMail-Priority": "Low",
    }
  }
  // Normal is the implicit default — don't add noise to the envelope.
  return {}
}
