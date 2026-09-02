/**
 * Brand themes mirrored from the noddi-frontend design tokens
 * (packages/noddi-ui-web/src/index.css — `.noddi`, `.dekkfix`, ...).
 *
 * These drive the header colors of outgoing emails so support mails match the
 * customer-facing web apps. The footer is intentionally NOT brand colored —
 * all emails use the same dark gray footer (see FOOTER_THEME).
 */

export interface BrandTheme {
  /** Canonical brand slug. */
  id: string
  /** Human readable brand label. */
  label: string
  /** Header background (brand primary). */
  headerBg: string
  /** Header foreground (primary-foreground). */
  headerText: string
  /** Accent used for links / buttons in the body. */
  accent: string
}

/** Shared dark gray footer used for every outgoing email, regardless of brand. */
export const FOOTER_THEME = {
  bg: "#2B2B2B",
  text: "#C9CBCF",
  link: "#FFFFFF",
  border: "#3A3A3A",
} as const

export const BRAND_THEMES: Record<string, BrandTheme> = {
  noddi: {
    id: "noddi",
    label: "Noddi",
    headerBg: "#35155A", // --primary (darkPurple)
    headerText: "#FFFFFF", // --primary-foreground
    accent: "#7F5CBA", // --secondary
  },
  dekkfix: {
    id: "dekkfix",
    label: "Dekkfix",
    headerBg: "#229799", // --button-primary
    headerText: "#FFFFFF", // --primary-foreground
    accent: "#48CFCB", // --secondary
  },
}

export const DEFAULT_BRAND_THEME = BRAND_THEMES.noddi

/**
 * Resolves a brand theme from free-form hints (inbox name, brand field,
 * sender address, domain). Falls back to the Noddi theme.
 */
export function resolveBrandTheme(...hints: (string | null | undefined)[]): BrandTheme {
  const haystack = hints
    .filter(Boolean)
    .join(" ")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")

  for (const theme of Object.values(BRAND_THEMES)) {
    if (haystack.includes(theme.id)) return theme
  }
  return DEFAULT_BRAND_THEME
}
