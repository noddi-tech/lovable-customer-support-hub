import { navioSourceHeaders } from "./navio-source.ts"
/**
 * Company / legal information used in the footer of outgoing support emails.
 *
 * Mirrors the structure of the Noddi backend `email_brand_footer.html`
 * (legal name, address, org. number, support email, website) but rendered with
 * the shared dark gray footer used across all brands here.
 *
 * The values are fetched from the Noddi backend service-organization API and
 * cached in memory for 6 hours (they change very rarely). Static fallbacks keep
 * emails correct if the API is unavailable.
 */

import { type BrandTheme, FOOTER_THEME } from "./brand-theme.ts"

const API_BASE = (Deno.env.get("NODDI_API_BASE") || "https://api.noddi.co").replace(/\/+$/, "")
const NODDI_TOKEN = Deno.env.get("NODDI_API_TOKEN") || ""
const CACHE_TTL_MS = 6 * 60 * 60 * 1000 // 6 hours

export interface CompanyInfo {
  /** Legal entity name, e.g. "Noddi AS". */
  legalName: string
  /** Street address line, e.g. "Ramstadsletta 24". */
  street: string | null
  /** "1363 Høvik" */
  postal: string | null
  /** Norwegian organization number. */
  orgNumber: string | null
  supportEmail: string | null
  supportPhone: string | null
  website: string | null
}

const STATIC_COMPANY_INFO: Record<string, CompanyInfo> = {
  noddi: {
    legalName: "Noddi AS",
    street: "Ramstadsletta 24",
    postal: "1363 Høvik",
    orgNumber: "927347407",
    supportEmail: "hei@noddi.no",
    supportPhone: null,
    website: "https://www.noddi.co/",
  },
  dekkfix: {
    legalName: "Dekkfix AS",
    street: "Ramstadsletta 24",
    postal: "1363 Høvik",
    orgNumber: "933874869",
    supportEmail: "hei@dekkfix.no",
    supportPhone: null,
    website: "https://dekkfix.no/",
  },
}

const cache = new Map<string, { at: number; info: CompanyInfo }>()

interface SoAddress {
  street_name?: string
  street_number?: string
  zip_code?: string
  city?: string
}

interface SoRecord {
  id?: number
  name?: string
  email?: string
  website?: string
  address?: SoAddress | null
  brand?: { slug?: string; name?: string } | null
  organization_number?: string | number | null
}

const noddiHeaders = (): Record<string, string> => ({
  Accept: "application/json",
  ...navioSourceHeaders(),
  ...(NODDI_TOKEN ? { Authorization: `Token ${NODDI_TOKEN}` } : {}),
})

function toCompanyInfo(record: SoRecord, fallback: CompanyInfo): CompanyInfo {
  const addr = record.address || null
  const street = addr?.street_name
    ? [addr.street_name, addr.street_number].filter(Boolean).join(" ")
    : fallback.street
  const postal =
    addr?.zip_code || addr?.city
      ? [addr.zip_code, addr.city].filter(Boolean).join(" ")
      : fallback.postal

  return {
    legalName: record.name || fallback.legalName,
    street: street || null,
    postal: postal || null,
    orgNumber: record.organization_number ? String(record.organization_number) : fallback.orgNumber,
    supportEmail: record.email || fallback.supportEmail,
    supportPhone: fallback.supportPhone,
    website: record.website || fallback.website,
  }
}

/**
 * Resolves company info for a brand slug ("noddi", "dekkfix", ...).
 * Cached in memory for 6 hours; falls back to static values on any failure.
 */
export async function getCompanyInfo(brandId: string): Promise<CompanyInfo> {
  const key = brandId.toLowerCase()
  const fallback = STATIC_COMPANY_INFO[key] || STATIC_COMPANY_INFO.noddi

  const cached = cache.get(key)
  if (cached && Date.now() - cached.at < CACHE_TTL_MS) return cached.info

  try {
    const listRes = await fetch(
      `${API_BASE}/v1/service-organizations/?page_size=100&search=${encodeURIComponent(key)}`,
      { headers: noddiHeaders() },
    )
    if (!listRes.ok) throw new Error(`service-organizations list [${listRes.status}]`)
    const list = await listRes.json()
    const results: SoRecord[] = Array.isArray(list?.results) ? list.results : []

    const match =
      results.find((r) => (r.brand?.slug || "").toLowerCase() === key) ||
      results.find((r) => (r.name || "").toLowerCase().includes(key)) ||
      null
    if (!match?.id) throw new Error(`no service organization for brand "${key}"`)

    // The list record omits organization_number; the detail record has it.
    let detail: SoRecord = match
    const detailRes = await fetch(`${API_BASE}/v1/service-organizations/${match.id}/`, {
      headers: noddiHeaders(),
    })
    if (detailRes.ok) detail = { ...match, ...(await detailRes.json()) }

    const info = toCompanyInfo(detail, fallback)
    cache.set(key, { at: Date.now(), info })
    return info
  } catch (err) {
    console.error(`[email-company-info] falling back to static info for "${key}": ${err}`)
    cache.set(key, { at: Date.now(), info: fallback })
    return fallback
  }
}

const esc = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;")

const stripScheme = (url: string) => url.replace(/^https?:\/\//i, "").replace(/\/+$/, "")

/**
 * Renders the informative company footer (legal name, address, org. number,
 * contact details) used for every brand.
 */
export function renderCompanyFooterHtml(
  info: CompanyInfo,
  theme: BrandTheme,
  brandLabel?: string | null,
): string {
  const linkStyle = `color:${FOOTER_THEME.link};text-decoration:underline;`
  const mutedStyle = `color:${FOOTER_THEME.text};`
  const title = brandLabel || theme.label

  const contactParts: string[] = []
  if (info.orgNumber)
    contactParts.push(`<span style="${mutedStyle}">Org.nr: ${esc(info.orgNumber)}</span>`)
  if (info.supportEmail) {
    contactParts.push(
      `<a href="mailto:${esc(info.supportEmail)}" style="${linkStyle}">${esc(info.supportEmail)}</a>`,
    )
  }
  if (info.supportPhone) {
    contactParts.push(
      `<a href="tel:${esc(info.supportPhone)}" style="${linkStyle}">${esc(info.supportPhone)}</a>`,
    )
  }
  if (info.website) {
    contactParts.push(
      `<a href="${esc(info.website)}" style="${linkStyle}">${esc(stripScheme(info.website))}</a>`,
    )
  }

  const addressLine = [info.street, info.postal]
    .filter(Boolean)
    .map((v) => esc(String(v)))
    .join(", ")

  return [
    `<div style="font-size:14px;font-weight:600;color:#FFFFFF;margin-bottom:6px;">${esc(title)}</div>`,
    `<div style="${mutedStyle}font-size:12px;line-height:1.6;">${esc(info.legalName)}${
      addressLine ? ` &middot; ${addressLine}` : ""
    }</div>`,
    contactParts.length
      ? `<div style="margin-top:10px;font-size:12px;line-height:1.8;">${contactParts.join(
          ` <span style="${mutedStyle}opacity:0.5;">&middot;</span> `,
        )}</div>`
      : "",
    `<div style="margin-top:14px;padding-top:12px;border-top:1px solid ${FOOTER_THEME.border};${mutedStyle}font-size:11px;">&copy; ${new Date().getFullYear()} ${esc(
      info.legalName,
    )}. Alle rettigheter reservert.</div>`,
  ]
    .filter(Boolean)
    .join("")
}
