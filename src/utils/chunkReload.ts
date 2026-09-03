/**
 * Recovery for stale code-split chunks after a redeploy.
 *
 * Content-hashed assets are purged on deploy, so a long-lived tab that
 * navigates to a lazy route requests a dead chunk and `import()` rejects with
 * "Failed to fetch dynamically imported module". The only safe recovery is a
 * single full reload, guarded so we never loop.
 */

const RELOAD_KEY = "supporthub:chunk-reload-at"
const RELOAD_WINDOW_MS = 30_000

export function isChunkLoadError(error: unknown): boolean {
  if (!error) return false
  const err = error as { message?: string; name?: string }
  const message = `${err.name ?? ""} ${err.message ?? String(error)}`.toLowerCase()
  return (
    message.includes("failed to fetch dynamically imported module") ||
    message.includes("error loading dynamically imported module") ||
    message.includes("importing a module script failed") ||
    message.includes("dynamically imported module") ||
    message.includes("chunkloaderror") ||
    (message.includes("unexpected token '<'") && message.includes("module"))
  )
}

/** Reloads once per 30s window. Returns true when a reload was triggered. */
export function reloadOnceForChunkError(reason: string): boolean {
  try {
    const last = Number(sessionStorage.getItem(RELOAD_KEY) ?? 0)
    if (Date.now() - last < RELOAD_WINDOW_MS) {
      console.error("[chunkReload] Already reloaded recently, not looping:", reason)
      return false
    }
    sessionStorage.setItem(RELOAD_KEY, String(Date.now()))
  } catch {
    // sessionStorage unavailable (private mode) — fall through to a single reload
  }
  console.warn("[chunkReload] Stale build detected, reloading:", reason)
  window.location.reload()
  return true
}
