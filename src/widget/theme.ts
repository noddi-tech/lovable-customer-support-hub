/**
 * Host-supplied brand theming for the widget.
 *
 * Mirrors the colour fields on the backend `Brand` model (color_primary,
 * color_secondary, color_accent) so a host app can make the widget match the
 * brand theme it is already rendering.
 */

export interface WidgetThemeOptions {
  /** Main brand colour: header, primary buttons, customer bubbles. */
  primaryColor?: string
  /** Supporting colour: secondary buttons, badges, subtle surfaces. */
  secondaryColor?: string
  /** Highlight colour: links, focus rings, selected states. */
  accentColor?: string
  /** Text/icon colour rendered on top of the primary colour. Auto-derived when omitted. */
  onPrimaryColor?: string
}

export interface ResolvedWidgetTheme {
  primaryColor: string
  secondaryColor: string
  accentColor: string
  onPrimaryColor: string
}

/** Accept only simple, safe CSS colour literals (hex, rgb(a), hsl(a), named). */
const COLOR_PATTERN =
  /^(#[0-9a-f]{3,8}|rgba?\(\s*[\d.\s,%/]+\)|hsla?\(\s*[\d.\s,%/deg]+\)|[a-z]{3,20})$/i

export function sanitizeColor(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined
  const trimmed = value.trim()
  if (!trimmed || trimmed.length > 64) return undefined
  return COLOR_PATTERN.test(trimmed) ? trimmed : undefined
}

export function sanitizeTheme(theme: unknown): WidgetThemeOptions {
  if (!theme || typeof theme !== "object") return {}
  const t = theme as Record<string, unknown>
  const out: WidgetThemeOptions = {}
  // Support both camelCase and the backend Brand field names.
  const primary = sanitizeColor(t.primaryColor ?? t.color_primary ?? t.primary)
  const secondary = sanitizeColor(t.secondaryColor ?? t.color_secondary ?? t.secondary)
  const accent = sanitizeColor(t.accentColor ?? t.color_accent ?? t.accent)
  const onPrimary = sanitizeColor(t.onPrimaryColor ?? t.textOnPrimary ?? t.color_on_primary)
  if (primary) out.primaryColor = primary
  if (secondary) out.secondaryColor = secondary
  if (accent) out.accentColor = accent
  if (onPrimary) out.onPrimaryColor = onPrimary
  return out
}

/** Rough relative luminance for hex colours; used to pick readable on-primary text. */
function readableTextColor(color: string): string {
  const hex = color.trim()
  const match = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(hex)
  if (!match) return "#ffffff"
  let raw = match[1]
  if (raw.length === 3)
    raw = raw
      .split("")
      .map((c) => c + c)
      .join("")
  const r = parseInt(raw.slice(0, 2), 16) / 255
  const g = parseInt(raw.slice(2, 4), 16) / 255
  const b = parseInt(raw.slice(4, 6), 16) / 255
  const lin = (c: number) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4)
  const luminance = 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b)
  return luminance > 0.6 ? "#111827" : "#ffffff"
}

/**
 * Merge the host theme over the admin-configured colours.
 * Secondary/accent fall back to primary so partial themes still look coherent.
 */
export function resolveTheme(
  configPrimaryColor: string,
  hostTheme?: WidgetThemeOptions,
): ResolvedWidgetTheme {
  const primaryColor = hostTheme?.primaryColor || configPrimaryColor
  const secondaryColor = hostTheme?.secondaryColor || primaryColor
  const accentColor = hostTheme?.accentColor || secondaryColor
  const onPrimaryColor = hostTheme?.onPrimaryColor || readableTextColor(primaryColor)
  return { primaryColor, secondaryColor, accentColor, onPrimaryColor }
}

/** CSS custom properties applied to the widget root so styles can theme themselves. */
export function themeCssVars(theme: ResolvedWidgetTheme): React.CSSProperties {
  return {
    ["--noddi-primary" as string]: theme.primaryColor,
    ["--noddi-secondary" as string]: theme.secondaryColor,
    ["--noddi-accent" as string]: theme.accentColor,
    ["--noddi-on-primary" as string]: theme.onPrimaryColor,
  } as React.CSSProperties
}
