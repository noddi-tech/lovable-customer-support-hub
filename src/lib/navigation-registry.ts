/**
 * Central registry of navigable pages used by the ⌘K command palette.
 * `scope: 'app'` = main product pages, `scope: 'admin'` = admin portal pages.
 */
export type NavScope = "app" | "admin"

export interface NavPage {
  id: string
  title: string
  path: string
  group: string
  scope: NavScope
  keywords?: string[]
  /** Visibility requirement. */
  requires?: "admin" | "superAdmin"
}

export const APP_PAGES: NavPage[] = [
  {
    id: "home",
    title: "Home",
    path: "/home",
    group: "General",
    scope: "app",
    keywords: ["dashboard", "start"],
  },
  { id: "search", title: "Search", path: "/search", group: "General", scope: "app" },
  {
    id: "notifications",
    title: "Notifications",
    path: "/notifications/unread",
    group: "General",
    scope: "app",
    keywords: ["alerts", "mentions"],
  },

  {
    id: "text-open",
    title: "Email — Open",
    path: "/interactions/text/open",
    group: "Conversations",
    scope: "app",
    keywords: ["inbox", "tickets", "mail"],
  },
  {
    id: "text-pending",
    title: "Email — Pending",
    path: "/interactions/text/pending",
    group: "Conversations",
    scope: "app",
  },
  {
    id: "text-resolved",
    title: "Email — Resolved",
    path: "/interactions/text/resolved",
    group: "Conversations",
    scope: "app",
    keywords: ["closed"],
  },
  {
    id: "text-assigned",
    title: "Email — Assigned to me",
    path: "/interactions/text/assigned",
    group: "Conversations",
    scope: "app",
  },
  {
    id: "chat-active",
    title: "Live chat — Active",
    path: "/interactions/chat/active",
    group: "Conversations",
    scope: "app",
    keywords: ["widget", "chat"],
  },
  {
    id: "chat-pending",
    title: "Live chat — Pending",
    path: "/interactions/chat/pending",
    group: "Conversations",
    scope: "app",
  },

  {
    id: "voice",
    title: "Voice — Calls",
    path: "/interactions/voice",
    group: "Voice",
    scope: "app",
    keywords: ["phone", "aircall"],
  },
  {
    id: "voice-analytics",
    title: "Voice — Analytics",
    path: "/interactions/voice/analytics",
    group: "Voice",
    scope: "app",
  },
  {
    id: "voice-settings",
    title: "Voice — Settings",
    path: "/interactions/voice/settings",
    group: "Voice",
    scope: "app",
  },

  { id: "cases", title: "Cases", path: "/operations/cases", group: "Operations", scope: "app" },
  {
    id: "case-reports",
    title: "Case reports",
    path: "/operations/case-reports",
    group: "Operations",
    scope: "app",
  },
  {
    id: "tickets",
    title: "Service tickets",
    path: "/operations/tickets",
    group: "Operations",
    scope: "app",
  },
  {
    id: "customers",
    title: "Customers",
    path: "/customers",
    group: "Operations",
    scope: "app",
    keywords: ["contacts", "people"],
  },
  {
    id: "analytics",
    title: "Analytics",
    path: "/operations/analytics",
    group: "Operations",
    scope: "app",
    keywords: ["reports", "stats"],
  },
  {
    id: "bulk-outreach",
    title: "Bulk outreach",
    path: "/operations/bulk-outreach",
    group: "Operations",
    scope: "app",
  },

  {
    id: "recruitment",
    title: "Recruitment",
    path: "/operations/recruitment",
    group: "Recruitment",
    scope: "app",
    keywords: ["hiring", "rekruttering"],
  },
  {
    id: "recruitment-pipeline",
    title: "Recruitment — Pipeline",
    path: "/operations/recruitment/pipeline",
    group: "Recruitment",
    scope: "app",
  },
  {
    id: "recruitment-applicants",
    title: "Recruitment — Applicants",
    path: "/operations/recruitment/applicants",
    group: "Recruitment",
    scope: "app",
    keywords: ["candidates"],
  },
  {
    id: "recruitment-positions",
    title: "Recruitment — Positions",
    path: "/operations/recruitment/positions",
    group: "Recruitment",
    scope: "app",
    keywords: ["jobs"],
  },

  {
    id: "campaigns",
    title: "Campaigns",
    path: "/marketing/campaigns",
    group: "Marketing",
    scope: "app",
  },
  {
    id: "newsletters",
    title: "Newsletters",
    path: "/marketing/newsletters",
    group: "Marketing",
    scope: "app",
  },

  { id: "settings", title: "Settings", path: "/settings", group: "Settings", scope: "app" },
  {
    id: "settings-profile",
    title: "Settings — Profile",
    path: "/settings/profile",
    group: "Settings",
    scope: "app",
  },
  {
    id: "settings-notifications",
    title: "Settings — Notifications",
    path: "/settings/notifications",
    group: "Settings",
    scope: "app",
  },
  {
    id: "settings-tags",
    title: "Settings — Tags",
    path: "/settings/tags",
    group: "Settings",
    scope: "app",
  },
  {
    id: "settings-email-templates",
    title: "Settings — Email templates",
    path: "/settings/email-templates",
    group: "Settings",
    scope: "app",
  },
]

export const ADMIN_PAGES: NavPage[] = [
  {
    id: "admin-overview",
    title: "Admin overview",
    path: "/admin",
    group: "Organization",
    scope: "admin",
    requires: "admin",
  },
  {
    id: "admin-users",
    title: "User management",
    path: "/admin/users",
    group: "Organization",
    scope: "admin",
    requires: "admin",
    keywords: ["members", "roles", "departments"],
  },
  {
    id: "admin-inboxes",
    title: "Inboxes",
    path: "/admin/inboxes",
    group: "Organization",
    scope: "admin",
    requires: "admin",
  },
  {
    id: "admin-general",
    title: "General settings",
    path: "/admin/general",
    group: "Organization",
    scope: "admin",
    requires: "admin",
  },
  {
    id: "admin-health",
    title: "System health",
    path: "/admin/health",
    group: "Organization",
    scope: "admin",
    requires: "admin",
  },
  {
    id: "admin-feature-flags",
    title: "Feature flags",
    path: "/admin/feature-flags",
    group: "Organization",
    scope: "admin",
    requires: "admin",
    keywords: ["openfeature", "toggles", "experiments"],
  },
  {
    id: "admin-background-jobs",
    title: "Background jobs",
    path: "/admin/background-jobs",
    group: "Organization",
    scope: "admin",
    requires: "admin",
    keywords: ["cron"],
  },
  {
    id: "admin-edge-functions",
    title: "Edge functions",
    path: "/admin/edge-functions",
    group: "Organization",
    scope: "admin",
    requires: "admin",
  },
  {
    id: "admin-gdpr",
    title: "GDPR dashboard",
    path: "/admin/gdpr",
    group: "Organization",
    scope: "admin",
    requires: "admin",
    keywords: ["privacy", "erasure"],
  },

  {
    id: "admin-integrations",
    title: "Integrations & routing",
    path: "/admin/integrations",
    group: "Integrations",
    scope: "admin",
    requires: "admin",
    keywords: ["slack", "sendgrid", "aircall", "gmail"],
  },
  {
    id: "admin-import",
    title: "Import data",
    path: "/admin/import",
    group: "Integrations",
    scope: "admin",
    requires: "admin",
  },

  {
    id: "admin-design",
    title: "Design",
    path: "/admin/design",
    group: "Customization",
    scope: "admin",
    requires: "admin",
    keywords: ["branding", "signature"],
  },
  {
    id: "admin-design-components",
    title: "Design — Components",
    path: "/admin/design/components",
    group: "Customization",
    scope: "admin",
    requires: "admin",
  },

  {
    id: "admin-knowledge",
    title: "Knowledge management",
    path: "/admin/knowledge",
    group: "AI & Intelligence",
    scope: "admin",
    requires: "admin",
  },
  {
    id: "admin-ai-chatbot",
    title: "AI chatbot",
    path: "/admin/ai-chatbot",
    group: "AI & Intelligence",
    scope: "admin",
    requires: "admin",
  },
  {
    id: "admin-widget",
    title: "Contact widget",
    path: "/admin/widget",
    group: "AI & Intelligence",
    scope: "admin",
    requires: "admin",
  },

  {
    id: "admin-recruitment",
    title: "Recruitment settings",
    path: "/admin/recruitment",
    group: "Recruitment",
    scope: "admin",
    requires: "admin",
  },
  {
    id: "admin-recruitment-import",
    title: "Recruitment import",
    path: "/admin/recruitment/import",
    group: "Recruitment",
    scope: "admin",
    requires: "admin",
  },

  {
    id: "sa-dashboard",
    title: "Super admin dashboard",
    path: "/super-admin/dashboard",
    group: "Super Admin",
    scope: "admin",
    requires: "superAdmin",
  },
  {
    id: "sa-organizations",
    title: "Service organizations",
    path: "/super-admin/organizations",
    group: "Super Admin",
    scope: "admin",
    requires: "superAdmin",
  },
  {
    id: "sa-users",
    title: "All users",
    path: "/super-admin/users",
    group: "Super Admin",
    scope: "admin",
    requires: "superAdmin",
  },
  {
    id: "sa-roles",
    title: "Role management",
    path: "/super-admin/roles",
    group: "Super Admin",
    scope: "admin",
    requires: "superAdmin",
  },
  {
    id: "sa-import",
    title: "Super admin import",
    path: "/super-admin/import",
    group: "Super Admin",
    scope: "admin",
    requires: "superAdmin",
  },
  {
    id: "sa-audit-logs",
    title: "Audit logs",
    path: "/super-admin/audit-logs",
    group: "Super Admin",
    scope: "admin",
    requires: "superAdmin",
  },
  {
    id: "sa-audit-analytics",
    title: "Audit log analytics",
    path: "/super-admin/audit-logs/analytics",
    group: "Super Admin",
    scope: "admin",
    requires: "superAdmin",
  },
  {
    id: "sa-analytics",
    title: "System analytics",
    path: "/super-admin/analytics",
    group: "Super Admin",
    scope: "admin",
    requires: "superAdmin",
  },
  {
    id: "sa-email-templates",
    title: "System email templates",
    path: "/super-admin/email-templates",
    group: "Super Admin",
    scope: "admin",
    requires: "superAdmin",
  },
  {
    id: "sa-field-types",
    title: "Recruitment field types",
    path: "/super-admin/recruitment/field-types",
    group: "Super Admin",
    scope: "admin",
    requires: "superAdmin",
  },
  {
    id: "sa-templates",
    title: "Recruitment system templates",
    path: "/super-admin/recruitment/templates",
    group: "Super Admin",
    scope: "admin",
    requires: "superAdmin",
  },
]

export function getNavPages(
  scope: NavScope,
  perms: { isAdmin?: boolean; isSuperAdmin?: boolean },
): NavPage[] {
  const pages = scope === "admin" ? ADMIN_PAGES : APP_PAGES
  return pages.filter((p) => {
    if (p.requires === "superAdmin") return !!perms.isSuperAdmin
    if (p.requires === "admin") return !!perms.isAdmin
    return true
  })
}

/** Lightweight fuzzy-ish match on title, path, group and keywords. */
export function filterNavPages(pages: NavPage[], query: string): NavPage[] {
  const q = query.trim().toLowerCase()
  if (!q) return pages
  const terms = q.split(/\s+/)
  return pages.filter((p) => {
    const haystack = [p.title, p.path, p.group, ...(p.keywords ?? [])].join(" ").toLowerCase()
    return terms.every((t) => haystack.includes(t))
  })
}
