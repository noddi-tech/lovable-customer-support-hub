import { toast } from "sonner"

/**
 * Shared error surfacing for toasts.
 *
 * Two problems this solves:
 *  1. Most failures were reported as a generic "Check the logs" string, which
 *     hides the status code / server message that actually explains the error.
 *  2. There was no way to get the details out of the UI — you had to retype
 *     them from a screenshot. Every error toast now carries a "Copy details"
 *     action that puts a complete, pasteable report on the clipboard.
 */

type UnknownRecord = Record<string, unknown>

const asRecord = (value: unknown): UnknownRecord | null =>
  typeof value === "object" && value !== null ? (value as UnknownRecord) : null

const str = (value: unknown): string | undefined => {
  if (typeof value === "string" && value.trim()) return value.trim()
  if (typeof value === "number" || typeof value === "boolean") return String(value)
  return undefined
}

/** Best-effort human message from anything that can be thrown or returned. */
export function describeError(error: unknown): string {
  if (!error) return "Unknown error"
  if (typeof error === "string") return error
  const rec = asRecord(error)
  if (!rec) return String(error)

  // Supabase (PostgrestError / FunctionsError) and fetch-style payloads.
  const parts = [
    str(rec.message),
    str(rec.error_description),
    str(rec.error) ?? str(asRecord(rec.error)?.message),
    str(rec.details),
    str(rec.hint),
  ].filter(Boolean) as string[]

  const unique = [...new Set(parts)]
  if (unique.length) return unique.join(" — ")
  try {
    return JSON.stringify(error)
  } catch {
    return String(error)
  }
}

/** Structured, pasteable report: message + status/code + context + environment. */
export function formatErrorReport(
  title: string,
  error: unknown,
  context?: Record<string, unknown>,
): string {
  const rec = asRecord(error)
  const lines: string[] = [
    `[${title}]`,
    `Message: ${describeError(error)}`,
    ...(rec?.status !== undefined ? [`Status: ${String(rec.status)}`] : []),
    ...(rec?.code !== undefined ? [`Code: ${String(rec.code)}`] : []),
    ...(rec?.name !== undefined && rec.name !== "Error" ? [`Type: ${String(rec.name)}`] : []),
  ]

  for (const [key, value] of Object.entries(context ?? {})) {
    if (value === undefined || value === null || value === "") continue
    lines.push(`${key}: ${typeof value === "string" ? value : JSON.stringify(value)}`)
  }

  if (typeof window !== "undefined") {
    lines.push(`URL: ${window.location.href}`)
  }
  lines.push(`Time: ${new Date().toISOString()}`)
  const commit = typeof __APP_COMMIT__ !== "undefined" ? __APP_COMMIT__ : undefined
  if (commit) lines.push(`Build: ${commit}`)

  const stack = str(rec?.stack)
  if (stack) lines.push("", "Stack:", stack)

  return lines.join("\n")
}

export async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text)
    return true
  } catch {
    // Clipboard API is unavailable on insecure origins / older Safari.
    try {
      const area = document.createElement("textarea")
      area.value = text
      area.style.position = "fixed"
      area.style.opacity = "0"
      document.body.appendChild(area)
      area.select()
      const ok = document.execCommand("copy")
      area.remove()
      return ok
    } catch {
      return false
    }
  }
}

/**
 * Error toast with the real server message plus a one-click "Copy details".
 * Use everywhere instead of `toast.error(title, { description: "…" })`.
 */
export function toastError(
  title: string,
  error: unknown,
  context?: Record<string, unknown>,
): void {
  const description = describeError(error)
  const report = formatErrorReport(title, error, context)
  toast.error(title, {
    description,
    duration: 12_000,
    action: {
      label: "Copy details",
      onClick: () => {
        void copyText(report).then((ok) => {
          if (ok) toast.success("Error details copied")
          else toast.message("Copy failed", { description: report })
        })
      },
    },
  })
}
