import * as Sentry from "@sentry/react"
import { createRootRoute, createRoute, redirect } from "@tanstack/react-router"
import React, { Suspense } from "react"
import { AdminRoute } from "@/components/auth/AdminRoute"
import { ProtectedRoute } from "@/components/auth/ProtectedRoute"
import { SuperAdminRoute } from "@/components/auth/SuperAdminRoute"
import { ConversationRedirect } from "@/components/routing/ConversationRedirect"
import AdminDesignComponentsPage from "@/pages/AdminDesignComponentsPage"
import AllUsersManagement from "@/pages/AllUsersManagement"
import AuditLogAnalytics from "@/pages/AuditLogAnalytics"
import AuditLogs from "@/pages/AuditLogs"
import { Auth } from "@/pages/Auth"
import BackgroundJobsPage from "@/pages/admin/BackgroundJobsPage"
import GdprDashboardPage from "@/pages/admin/gdpr/GdprDashboardPage"
import CaseDetailPage from "@/pages/CaseDetailPage"
import CaseReportsPage from "@/pages/CaseReportsPage"
import CasesPage from "@/pages/CasesPage"
import CustomerDetailPage from "@/pages/CustomerDetailPage"
import CustomersPage from "@/pages/CustomersPage"
import CandidateFormPage from "@/pages/candidate/CandidateFormPage"
import DataDeletionStatus from "@/pages/DataDeletionStatus"
import HomePage from "@/pages/HomePage"
import Index from "@/pages/Index"
import KnowledgeManagement from "@/pages/KnowledgeManagement"
import NotFound from "@/pages/NotFound"
import NotificationsPage from "@/pages/NotificationsPage"
import OAuthConsent from "@/pages/OAuthConsent"
import OrganizationDetails from "@/pages/OrganizationDetails"
import OrganizationManagement from "@/pages/OrganizationManagement"
import Privacy from "@/pages/Privacy"
import RoleManagement from "@/pages/RoleManagement"
import SearchPage from "@/pages/SearchPage"
import Settings from "@/pages/Settings"
import SuperAdminDashboard from "@/pages/SuperAdminDashboard"
import SuperAdminEmailTemplates from "@/pages/SuperAdminEmailTemplates"
import SuperAdminImport from "@/pages/SuperAdminImport"
import SystemAnalytics from "@/pages/SystemAnalytics"
import FieldTypesPage from "@/pages/super-admin/recruitment/FieldTypesPage"
import SystemTemplateEditorPage from "@/pages/super-admin/recruitment/SystemTemplateEditorPage"
import SystemTemplatesPage from "@/pages/super-admin/recruitment/SystemTemplatesPage"
import Terms from "@/pages/Terms"
import { AppShell } from "@/router/AppShell"

const DocsPage = React.lazy(() => import("@/pages/DocsPage"))
const ApiDocsPage = React.lazy(() => import("@/pages/ApiDocsPage"))

function Protected({ children }: { children: React.ReactNode }) {
  return <ProtectedRoute>{children}</ProtectedRoute>
}

function Admin({ children }: { children: React.ReactNode }) {
  return (
    <ProtectedRoute>
      <AdminRoute>{children}</AdminRoute>
    </ProtectedRoute>
  )
}

function SuperAdmin({ children }: { children: React.ReactNode }) {
  return (
    <ProtectedRoute>
      <SuperAdminRoute>{children}</SuperAdminRoute>
    </ProtectedRoute>
  )
}

export const rootRoute = createRootRoute({
  component: AppShell,
  notFoundComponent: () => (
    <Protected>
      <NotFound />
    </Protected>
  ),
  errorComponent: ({ error }) => {
    Sentry.captureException(error)
    return (
      <div className="flex min-h-screen items-center justify-center p-6">
        <div className="max-w-md text-center">
          <h1 className="text-lg font-semibold">Something went wrong</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            {error instanceof Error ? error.message : "Unexpected routing error"}
          </p>
        </div>
      </div>
    )
  },
})

function route(path: string, component: () => React.ReactNode) {
  return createRoute({
    getParentRoute: () => rootRoute,
    path,
    component,
  })
}

function redirectRoute(path: string, to: string) {
  return createRoute({
    getParentRoute: () => rootRoute,
    path,
    beforeLoad: () => {
      throw redirect({ to: to, replace: true })
    },
  })
}

const authRoute = route("/auth", () => <Auth />)
const oauthConsentRoute = route("/.lovable/oauth/consent", () => <OAuthConsent />)
const dataDeletionRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/data-deletion-status/$code",
  component: () => <DataDeletionStatus />,
})
const applyFormRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/apply/form/$token",
  component: () => <CandidateFormPage />,
})

const indexRedirect = redirectRoute("/", "/home")
const homeRoute = route("/home", () => (
  <Protected>
    <HomePage />
  </Protected>
))

const shortConversationRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/c/$conversationId",
  component: () => (
    <Protected>
      <ConversationRedirect />
    </Protected>
  ),
})
const shortConversationMessageRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/c/$conversationId/m/$messageId",
  component: () => (
    <Protected>
      <ConversationRedirect />
    </Protected>
  ),
})

const docsIndexRoute = route("/docs", () => (
  <Protected>
    <Suspense fallback={null}>
      <DocsPage />
    </Suspense>
  </Protected>
))
const docsSplatRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/docs/$",
  component: () => (
    <Protected>
      <Suspense fallback={null}>
        <DocsPage />
      </Suspense>
    </Protected>
  ),
})
const apiDocsRoute = route("/api-docs", () => (
  <Protected>
    <Suspense fallback={null}>
      <ApiDocsPage />
    </Suspense>
  </Protected>
))

const searchRoute = route("/search", () => (
  <Protected>
    <SearchPage />
  </Protected>
))

const notificationsRedirect = redirectRoute("/notifications", "/notifications/unread")
const notificationsTabRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/notifications/$tab",
  component: () => (
    <Protected>
      <NotificationsPage />
    </Protected>
  ),
})

const interactionsRedirect = redirectRoute("/interactions", "/interactions/text/open")
const interactionsTextRedirect = redirectRoute("/interactions/text", "/interactions/text/open")
const interactionsTextConversationRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/interactions/text/conversations/$conversationId",
  component: () => (
    <Protected>
      <Index />
    </Protected>
  ),
})
const interactionsTextFilterRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/interactions/text/$filter",
  component: () => (
    <Protected>
      <Index />
    </Protected>
  ),
})

const interactionsChatRedirect = redirectRoute("/interactions/chat", "/interactions/chat/active")
const interactionsChatConversationRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/interactions/chat/conversations/$conversationId",
  component: () => (
    <Protected>
      <Index />
    </Protected>
  ),
})
const interactionsChatFilterRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/interactions/chat/$filter",
  component: () => (
    <Protected>
      <Index />
    </Protected>
  ),
})

const interactionsVoiceRoute = route("/interactions/voice", () => (
  <Protected>
    <Index />
  </Protected>
))
const interactionsVoiceAnalyticsRoute = route("/interactions/voice/analytics", () => (
  <Protected>
    <Index />
  </Protected>
))
const interactionsVoiceSettingsRoute = route("/interactions/voice/settings", () => (
  <Protected>
    <Index />
  </Protected>
))

const voiceRedirect = redirectRoute("/voice", "/interactions/voice")
const voiceAnalyticsRedirect = redirectRoute("/voice/analytics", "/interactions/voice/analytics")
const voiceSettingsRedirect = redirectRoute("/voice/settings", "/interactions/voice/settings")

const marketingRedirect = redirectRoute("/marketing", "/marketing/campaigns")
const marketingCampaignsRoute = route("/marketing/campaigns", () => (
  <Protected>
    <Index />
  </Protected>
))
const marketingNewslettersRoute = route("/marketing/newsletters", () => (
  <Protected>
    <Index />
  </Protected>
))

const operationsRedirect = redirectRoute("/operations", "/operations/cases")
const operationsCasesRoute = route("/operations/cases", () => (
  <Protected>
    <CasesPage />
  </Protected>
))
const operationsCaseReportsRoute = route("/operations/case-reports", () => (
  <Protected>
    <CaseReportsPage />
  </Protected>
))
const operationsCaseDetailRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/operations/cases/$id",
  component: () => (
    <Protected>
      <CaseDetailPage />
    </Protected>
  ),
})
const customersRoute = route("/customers", () => (
  <Protected>
    <CustomersPage />
  </Protected>
))
const customerDetailRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/customers/$id",
  component: () => (
    <Protected>
      <CustomerDetailPage />
    </Protected>
  ),
})
const operationsTicketsRoute = route("/operations/tickets", () => (
  <Protected>
    <Index />
  </Protected>
))
const operationsTicketDetailRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/operations/tickets/$id",
  component: () => (
    <Protected>
      <Index />
    </Protected>
  ),
})
const operationsRecruitmentRoute = route("/operations/recruitment", () => (
  <Protected>
    <Index />
  </Protected>
))
const operationsRecruitmentPipelineRoute = route("/operations/recruitment/pipeline", () => (
  <Protected>
    <Index />
  </Protected>
))
const operationsRecruitmentApplicantsRoute = route("/operations/recruitment/applicants", () => (
  <Protected>
    <Index />
  </Protected>
))
const operationsRecruitmentApplicantDetailRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/operations/recruitment/applicants/$id",
  component: () => (
    <Protected>
      <Index />
    </Protected>
  ),
})
const operationsRecruitmentPositionsRoute = route("/operations/recruitment/positions", () => (
  <Protected>
    <Index />
  </Protected>
))
const operationsRecruitmentPositionDetailRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/operations/recruitment/positions/$id",
  component: () => (
    <Protected>
      <Index />
    </Protected>
  ),
})
const operationsAnalyticsRoute = route("/operations/analytics", () => (
  <Protected>
    <Index />
  </Protected>
))
const operationsBulkOutreachRoute = route("/operations/bulk-outreach", () => (
  <Protected>
    <Index />
  </Protected>
))
const operationsServiceTicketsRedirect = redirectRoute(
  "/operations/service-tickets",
  "/operations/tickets",
)

const settingsRoute = route("/settings", () => (
  <Protected>
    <Settings />
  </Protected>
))
const settingsGeneralRedirect = redirectRoute("/settings/general", "/settings")
const settingsProfileRoute = route("/settings/profile", () => (
  <Protected>
    <Settings />
  </Protected>
))
const settingsNotificationsRoute = route("/settings/notifications", () => (
  <Protected>
    <Settings />
  </Protected>
))
const settingsTagsRoute = route("/settings/tags", () => (
  <Protected>
    <Settings />
  </Protected>
))
const settingsEmailTemplatesRoute = route("/settings/email-templates", () => (
  <Protected>
    <Settings />
  </Protected>
))
const settingsDepartmentsRedirect = redirectRoute("/settings/departments", "/admin/users")

const adminRoute = route("/admin", () => (
  <Admin>
    <Settings />
  </Admin>
))
const adminGeneralRoute = route("/admin/general", () => (
  <Admin>
    <Settings />
  </Admin>
))
const adminEmailDesignRedirect = redirectRoute("/admin/email-design", "/settings/email-templates")
const adminDepartmentsRedirect = redirectRoute("/admin/departments", "/admin/users")
const adminUsersRoute = route("/admin/users", () => (
  <Admin>
    <Settings />
  </Admin>
))
const adminInboxesRoute = route("/admin/inboxes", () => (
  <Admin>
    <Settings />
  </Admin>
))
const adminInboxDetailRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/admin/inboxes/$inboxId",
  component: () => (
    <Admin>
      <Settings />
    </Admin>
  ),
})
const adminIntegrationsRoute = route("/admin/integrations", () => (
  <Admin>
    <Settings />
  </Admin>
))
const adminVoiceRedirect = redirectRoute("/admin/voice", "/admin/integrations")
const adminDesignRoute = route("/admin/design", () => (
  <Admin>
    <Settings />
  </Admin>
))
const adminDesignComponentsRoute = route("/admin/design/components", () => (
  <Admin>
    <AdminDesignComponentsPage />
  </Admin>
))
const adminFeatureFlagsRoute = route("/admin/feature-flags", () => (
  <Admin>
    <Settings />
  </Admin>
))
const adminHealthRoute = route("/admin/health", () => (
  <Admin>
    <Settings />
  </Admin>
))
const adminEdgeFunctionsRoute = route("/admin/edge-functions", () => (
  <Admin>
    <Settings />
  </Admin>
))
const adminImportRoute = route("/admin/import", () => (
  <Admin>
    <Settings />
  </Admin>
))
const adminKnowledgeRoute = route("/admin/knowledge", () => (
  <Admin>
    <KnowledgeManagement />
  </Admin>
))
const adminAiChatbotRoute = route("/admin/ai-chatbot", () => (
  <Admin>
    <Settings />
  </Admin>
))
const adminWidgetRoute = route("/admin/widget", () => (
  <Admin>
    <Settings />
  </Admin>
))
const adminRecruitmentRoute = route("/admin/recruitment", () => (
  <Admin>
    <Settings />
  </Admin>
))
const adminRecruitmentImportRoute = route("/admin/recruitment/import", () => (
  <Admin>
    <Settings />
  </Admin>
))
const adminRecruitmentTemplateRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/admin/recruitment/templates/$id",
  component: () => (
    <Admin>
      <Settings />
    </Admin>
  ),
})
const adminGdprRoute = route("/admin/gdpr", () => (
  <Admin>
    <GdprDashboardPage />
  </Admin>
))
const adminBackgroundJobsRoute = route("/admin/background-jobs", () => (
  <Admin>
    <BackgroundJobsPage />
  </Admin>
))

const superAdminRedirect = redirectRoute("/super-admin", "/super-admin/dashboard")
const superAdminDashboardRoute = route("/super-admin/dashboard", () => (
  <SuperAdmin>
    <SuperAdminDashboard />
  </SuperAdmin>
))
const superAdminEmailTemplatesRoute = route("/super-admin/email-templates", () => (
  <SuperAdmin>
    <SuperAdminEmailTemplates />
  </SuperAdmin>
))
const superAdminOrganizationsRoute = route("/super-admin/organizations", () => (
  <SuperAdmin>
    <OrganizationManagement />
  </SuperAdmin>
))
const superAdminOrganizationDetailRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/super-admin/organizations/$id",
  component: () => (
    <SuperAdmin>
      <OrganizationDetails />
    </SuperAdmin>
  ),
})
const superAdminUsersRoute = route("/super-admin/users", () => (
  <SuperAdmin>
    <AllUsersManagement />
  </SuperAdmin>
))
const superAdminImportRoute = route("/super-admin/import", () => (
  <SuperAdmin>
    <SuperAdminImport />
  </SuperAdmin>
))
const superAdminRolesRoute = route("/super-admin/roles", () => (
  <SuperAdmin>
    <RoleManagement />
  </SuperAdmin>
))
const superAdminAuditLogsRoute = route("/super-admin/audit-logs", () => (
  <SuperAdmin>
    <AuditLogs />
  </SuperAdmin>
))
const superAdminAuditLogsAnalyticsRoute = route("/super-admin/audit-logs/analytics", () => (
  <SuperAdmin>
    <AuditLogAnalytics />
  </SuperAdmin>
))
const superAdminAnalyticsRoute = route("/super-admin/analytics", () => (
  <SuperAdmin>
    <SystemAnalytics />
  </SuperAdmin>
))
const superAdminFieldTypesRoute = route("/super-admin/recruitment/field-types", () => (
  <SuperAdmin>
    <FieldTypesPage />
  </SuperAdmin>
))
const superAdminTemplatesRoute = route("/super-admin/recruitment/templates", () => (
  <SuperAdmin>
    <SystemTemplatesPage />
  </SuperAdmin>
))
const superAdminTemplateDetailRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/super-admin/recruitment/templates/$id",
  component: () => (
    <SuperAdmin>
      <SystemTemplateEditorPage />
    </SuperAdmin>
  ),
})

const privacyRoute = route("/privacy", () => (
  <Protected>
    <Privacy />
  </Protected>
))
const termsRoute = route("/terms", () => (
  <Protected>
    <Terms />
  </Protected>
))

export const routeTree = rootRoute.addChildren([
  authRoute,
  oauthConsentRoute,
  dataDeletionRoute,
  applyFormRoute,
  indexRedirect,
  homeRoute,
  shortConversationRoute,
  shortConversationMessageRoute,
  docsIndexRoute,
  docsSplatRoute,
  apiDocsRoute,
  searchRoute,
  notificationsRedirect,
  notificationsTabRoute,
  interactionsRedirect,
  interactionsTextRedirect,
  interactionsTextConversationRoute,
  interactionsTextFilterRoute,
  interactionsChatRedirect,
  interactionsChatConversationRoute,
  interactionsChatFilterRoute,
  interactionsVoiceRoute,
  interactionsVoiceAnalyticsRoute,
  interactionsVoiceSettingsRoute,
  voiceRedirect,
  voiceAnalyticsRedirect,
  voiceSettingsRedirect,
  marketingRedirect,
  marketingCampaignsRoute,
  marketingNewslettersRoute,
  operationsRedirect,
  operationsCasesRoute,
  operationsCaseReportsRoute,
  operationsCaseDetailRoute,
  customersRoute,
  customerDetailRoute,
  operationsTicketsRoute,
  operationsTicketDetailRoute,
  operationsRecruitmentRoute,
  operationsRecruitmentPipelineRoute,
  operationsRecruitmentApplicantsRoute,
  operationsRecruitmentApplicantDetailRoute,
  operationsRecruitmentPositionsRoute,
  operationsRecruitmentPositionDetailRoute,
  operationsAnalyticsRoute,
  operationsBulkOutreachRoute,
  operationsServiceTicketsRedirect,
  settingsRoute,
  settingsGeneralRedirect,
  settingsProfileRoute,
  settingsNotificationsRoute,
  settingsTagsRoute,
  settingsEmailTemplatesRoute,
  settingsDepartmentsRedirect,
  adminRoute,
  adminGeneralRoute,
  adminEmailDesignRedirect,
  adminDepartmentsRedirect,
  adminUsersRoute,
  adminInboxesRoute,
  adminInboxDetailRoute,
  adminIntegrationsRoute,
  adminVoiceRedirect,
  adminDesignRoute,
  adminDesignComponentsRoute,
  adminFeatureFlagsRoute,
  adminHealthRoute,
  adminEdgeFunctionsRoute,
  adminImportRoute,
  adminKnowledgeRoute,
  adminAiChatbotRoute,
  adminWidgetRoute,
  adminRecruitmentRoute,
  adminRecruitmentImportRoute,
  adminRecruitmentTemplateRoute,
  adminGdprRoute,
  adminBackgroundJobsRoute,
  superAdminRedirect,
  superAdminDashboardRoute,
  superAdminEmailTemplatesRoute,
  superAdminOrganizationsRoute,
  superAdminOrganizationDetailRoute,
  superAdminUsersRoute,
  superAdminImportRoute,
  superAdminRolesRoute,
  superAdminAuditLogsRoute,
  superAdminAuditLogsAnalyticsRoute,
  superAdminAnalyticsRoute,
  superAdminFieldTypesRoute,
  superAdminTemplatesRoute,
  superAdminTemplateDetailRoute,
  privacyRoute,
  termsRoute,
])
