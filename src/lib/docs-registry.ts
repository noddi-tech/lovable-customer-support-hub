/**
 * Build-time registry of every markdown file under /docs.
 *
 * Vite inlines the raw file contents, so the documentation ships with the app
 * bundle and needs no runtime fetch or CMS (see ADR-0017).
 */

const modules = import.meta.glob("/docs/**/*.md", {
  query: "?raw",
  import: "default",
  eager: true,
})

export interface DocEntry {
  /** Route slug, e.g. `adr/0001-record-architecture-decisions`. */
  slug: string
  /** Repository path, e.g. `docs/adr/0001-....md`. */
  path: string
  /** Title taken from the first H1, falling back to a humanised file name. */
  title: string
  /** Section the doc is grouped under in the sidebar. */
  section: string
  content: string
}

function humanise(name: string): string {
  return name
    .replace(/\.md$/i, "")
    .replace(/[-_]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/^\w/, (c) => c.toUpperCase())
}

function extractTitle(content: string, fileName: string): string {
  const match = content.match(/^#\s+(.+)$/m)
  return match ? match[1].trim() : humanise(fileName)
}

/**
 * Sidebar grouping by logical domain rather than by folder. Docs that are not
 * listed explicitly fall back to their folder name (or "Reference").
 */
const SECTION_BY_SLUG: Record<string, string> = {
  README: "Start here",
  "dev/README": "Start here",
  "api/README": "Start here",

  "conversations/config": "Conversations & email",
  "conversations/perf-notes": "Conversations & email",

  AI_INTELLIGENCE_README: "AI & knowledge",
  KNOWLEDGE_SYSTEM: "AI & knowledge",

  "aircall-everywhere-integration": "Integrations",
  "aircall-testing-checklist": "Integrations",
  "aircall-troubleshooting": "Integrations",
  NODDI_API_ENDPOINTS: "Integrations",
  SLACK_ALERTING_SYSTEM: "Integrations",
  "sso/navio-auth-setup": "Integrations",
  WIDGET_EMBED_GUIDE: "Integrations",

  "customer-segmentation": "Product features",

  "layout/panes": "UI & layout",
  "scrolling-pattern": "UI & layout",

  "dev/debugging": "Operations & quality",
  "dev/logging": "Operations & quality",
  AUDIT_LOGGING: "Operations & quality",
  TESTING_GUIDE: "Operations & quality",
  PRODUCTION_TESTING_CHECKLIST: "Operations & quality",
}

const SECTION_LABELS: Record<string, string> = {
  "": "Reference",
  adr: "Architecture decisions",
  dev: "Operations & quality",
  conversations: "Conversations & email",
  layout: "UI & layout",
  sso: "Integrations",
  api: "Start here",
}

/** Display order of the sidebar sections. */
export const SECTION_ORDER = [
  "Start here",
  "Architecture decisions",
  "Conversations & email",
  "AI & knowledge",
  "Integrations",
  "Product features",
  "UI & layout",
  "Operations & quality",
  "Reference",
]

export const DOCS: DocEntry[] = Object.entries(modules)
  .map(([path, content]) => {
    const rel = path.replace(/^\/?docs\//, "")
    const slug = rel.replace(/\.md$/i, "")
    const dir = rel.includes("/") ? rel.slice(0, rel.indexOf("/")) : ""
    const fileName = rel.slice(rel.lastIndexOf("/") + 1)
    return {
      slug,
      path: `docs/${rel}`,
      title: extractTitle(content, fileName),
      section: SECTION_BY_SLUG[slug] ?? SECTION_LABELS[dir] ?? humanise(dir),
      content,
    }
  })
  .sort((a, b) => a.slug.localeCompare(b.slug, undefined, { numeric: true }))

export const DOC_SECTIONS: { section: string; docs: DocEntry[] }[] = (() => {
  const grouped = new Map<string, DocEntry[]>()
  for (const doc of DOCS) {
    const list = grouped.get(doc.section) ?? []
    list.push(doc)
    grouped.set(doc.section, list)
  }
  return [...grouped.entries()]
    .map(([section, docs]) => ({ section, docs }))
    .sort((a, b) => {
      const ai = SECTION_ORDER.indexOf(a.section)
      const bi = SECTION_ORDER.indexOf(b.section)
      return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi) || a.section.localeCompare(b.section)
    })
})()

export const DEFAULT_DOC_SLUG = DOCS.find((d) => d.slug === "README")?.slug ?? DOCS[0]?.slug ?? ""

export function findDoc(slug: string | undefined): DocEntry | undefined {
  if (!slug) return undefined
  const clean = slug.replace(/^\/+|\/+$/g, "").replace(/\.md$/i, "")
  return DOCS.find((d) => d.slug.toLowerCase() === clean.toLowerCase())
}

export function searchDocs(query: string): DocEntry[] {
  const q = query.trim().toLowerCase()
  if (q.length < 2) return DOCS
  return DOCS.filter(
    (d) => d.title.toLowerCase().includes(q) || d.content.toLowerCase().includes(q),
  )
}
