/** Formats a duration as a compact countdown: 2d 3h / 3h 12m / 12m 30s / 45s. */
export function formatCountdown(ms: number): string {
  const total = Math.floor(Math.abs(ms) / 1000)
  const d = Math.floor(total / 86400)
  const h = Math.floor((total % 86400) / 3600)
  const m = Math.floor((total % 3600) / 60)
  const s = total % 60
  if (d > 0) return `${d}d ${h}h`
  if (h > 0) return `${h}h ${m}m`
  if (m > 0) return `${m}m ${String(s).padStart(2, "0")}s`
  return `${s}s`
}
