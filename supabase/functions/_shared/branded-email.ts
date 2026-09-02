/**
 * Shared helper that wraps any transactional email body in the same branded
 * layout (header + informative company footer) used for agent replies.
 */

import { resolveBrandTheme } from "./brand-theme.ts"
import { getCompanyInfo, renderCompanyFooterHtml } from "./email-company-info.ts"
import { htmlToPlainText, renderEmailLayout } from "./email-layout.ts"

export interface BrandedEmailOptions {
  /** Inner body HTML (no <html>/<body> wrapper). */
  bodyHtml: string
  /** Free-form brand hints: brand slug, inbox name, sender address, etc. */
  brandHints?: (string | null | undefined)[]
  /** Optional preheader; defaults to the first 140 chars of the body text. */
  preheader?: string | null
}

/** True when the HTML is already a full document (previously wrapped). */
export function isFullHtmlDocument(html: string): boolean {
  return /<\s*(!doctype|html)\b/i.test(String(html || ""))
}

export async function renderBrandedEmail(options: BrandedEmailOptions): Promise<string> {
  const theme = resolveBrandTheme(...(options.brandHints || []))
  const companyInfo = await getCompanyInfo(theme.id)

  return renderEmailLayout({
    bodyHtml: options.bodyHtml,
    brandName: theme.label,
    brandTheme: theme,
    footerContent: renderCompanyFooterHtml(companyInfo, theme, theme.label),
    preheader: options.preheader || htmlToPlainText(options.bodyHtml).slice(0, 140),
  })
}
