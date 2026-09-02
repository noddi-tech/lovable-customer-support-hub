import { PersistQueryClientProvider } from "@tanstack/react-query-persist-client"
import React, { useEffect } from "react"
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom"
import { AdminRoute } from "@/components/auth/AdminRoute"
import { AuthProvider } from "@/components/auth/AuthContext"
import { ProtectedRoute } from "@/components/auth/ProtectedRoute"
import { SuperAdminRoute } from "@/components/auth/SuperAdminRoute"
import { ComposeDock } from "@/components/dashboard/compose/ComposeDock"
import { AircallFloatingButton } from "@/components/dashboard/voice/AircallFloatingButton"
import { AircallLoginModal } from "@/components/dashboard/voice/AircallLoginModal"
import { EnvBanner } from "@/components/dev/EnvBanner"
import { AppErrorFallback } from "@/components/error/AppErrorFallback"
import { ErrorBoundary } from "@/components/error/ErrorBoundary"
import { GlobalErrorBoundary } from "@/components/error/GlobalErrorBoundary"
import { I18nWrapper } from "@/components/i18n/I18nWrapper"
import { ObservabilityBridge } from "@/components/observability/ObservabilityBridge"
import { ConversationRedirect } from "@/components/routing/ConversationRedirect"
import { URLSanitizer } from "@/components/routing/URLSanitizer"
import { Toaster as Sonner } from "@/components/ui/sonner"
import { Toaster } from "@/components/ui/toaster"
import { TooltipProvider } from "@/components/ui/tooltip"
import { AircallProvider } from "@/contexts/AircallContext"
import { ComposeProvider } from "@/contexts/ComposeContext"
import { ConversationPresenceProvider } from "@/contexts/ConversationPresenceContext"
import { DesignSystemProvider } from "@/contexts/DesignSystemContext"
import { FeatureFlagsProvider } from "@/contexts/FeatureFlagsContext"
import { RealtimeProvider } from "@/contexts/RealtimeProvider"
import { useAircallPhone } from "@/hooks/useAircallPhone"
import { persister, queryClient } from "@/lib/persistedQueryClient"

const DocsPage = React.lazy(() => import("./pages/DocsPage"))
const ApiDocsPage = React.lazy(() => import("./pages/ApiDocsPage"))

import { useNavigate } from "react-router-dom"
import AdminDesignComponentsPage from "./pages/AdminDesignComponentsPage"
import AllUsersManagement from "./pages/AllUsersManagement"
import AuditLogAnalytics from "./pages/AuditLogAnalytics"
import AuditLogs from "./pages/AuditLogs"
import { Auth } from "./pages/Auth"
import BackgroundJobsPage from "./pages/admin/BackgroundJobsPage"
import GdprDashboardPage from "./pages/admin/gdpr/GdprDashboardPage"
import CaseDetailPage from "./pages/CaseDetailPage"
import CaseReportsPage from "./pages/CaseReportsPage"
import CasesPage from "./pages/CasesPage"
import CustomerDetailPage from "./pages/CustomerDetailPage"
import CustomersPage from "./pages/CustomersPage"
import CandidateFormPage from "./pages/candidate/CandidateFormPage"
import DataDeletionStatus from "./pages/DataDeletionStatus"
import HomePage from "./pages/HomePage"
import Index from "./pages/Index"
import KnowledgeManagement from "./pages/KnowledgeManagement"
import NotFound from "./pages/NotFound"
import NotificationsPage from "./pages/NotificationsPage"
import OAuthConsent from "./pages/OAuthConsent"
import OrganizationDetails from "./pages/OrganizationDetails"
import OrganizationManagement from "./pages/OrganizationManagement"
import Privacy from "./pages/Privacy"
import RoleManagement from "./pages/RoleManagement"
import SearchPage from "./pages/SearchPage"
import Settings from "./pages/Settings"
import SuperAdminDashboard from "./pages/SuperAdminDashboard"
import SuperAdminEmailTemplates from "./pages/SuperAdminEmailTemplates"
import SuperAdminImport from "./pages/SuperAdminImport"
import SystemAnalytics from "./pages/SystemAnalytics"
import FieldTypesPage from "./pages/super-admin/recruitment/FieldTypesPage"
import SystemTemplateEditorPage from "./pages/super-admin/recruitment/SystemTemplateEditorPage"
import SystemTemplatesPage from "./pages/super-admin/recruitment/SystemTemplatesPage"
import Terms from "./pages/Terms"
import "@/lib/i18n"
import "@/styles/controls.css"

const AppContent = () => {
  const navigate = useNavigate()

  // Navigation interceptor - DEV only
  useEffect(() => {
    if (import.meta.env.MODE !== "production") {
      const logNavigation = () => {
        console.log("🚀 [Navigation] Page changed to:", window.location.pathname)
      }
      window.addEventListener("popstate", logNavigation)
      return () => window.removeEventListener("popstate", logNavigation)
    }
  }, [])

  // Auth navigation events
  useEffect(() => {
    const handleAuthNavigate = (event: CustomEvent<{ path: string }>) => {
      if (import.meta.env.MODE !== "production") {
        console.log("🚀 [App] Auth navigation event received:", event.detail.path)
      }
      navigate(event.detail.path, { replace: true })
    }

    window.addEventListener("auth-navigate", handleAuthNavigate as EventListener)
    return () => window.removeEventListener("auth-navigate", handleAuthNavigate as EventListener)
  }, [navigate])

  // Emergency Escape handler removed — Radix UI handles Escape natively.
  // The old handler force-clicked triggers, racing with dialog close logic.

  // Backspace/Delete navigates back, unless the user is typing or a modal is open
  useEffect(() => {
    const handleBack = (e: KeyboardEvent) => {
      if (e.key !== "Backspace" && e.key !== "Delete") return
      if (e.metaKey || e.ctrlKey || e.altKey) return

      const target = e.target as HTMLElement | null
      if (
        target &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.tagName === "SELECT" ||
          target.isContentEditable ||
          target.closest('[contenteditable="true"]'))
      ) {
        return
      }

      // Skip while a dialog, popover, dropdown or sheet is open
      if (
        document.querySelector(
          '[role="dialog"], [role="alertdialog"], [data-radix-popper-content-wrapper]',
        )
      ) {
        return
      }

      e.preventDefault()
      const idx = (window.history.state as { idx?: number } | null)?.idx ?? 0
      if (idx > 0) navigate(-1)
      else navigate("/home")
    }

    window.addEventListener("keydown", handleBack)
    return () => window.removeEventListener("keydown", handleBack)
  }, [navigate])

  return (
    <URLSanitizer>
      <Routes>
        <Route path="/auth" element={<Auth />} />
        <Route path="/.lovable/oauth/consent" element={<OAuthConsent />} />
        <Route path="/data-deletion-status/:code" element={<DataDeletionStatus />} />
        <Route path="/apply/form/:token" element={<CandidateFormPage />} />

        {/* Root redirect to default section */}
        <Route path="/" element={<Navigate to="/home" replace />} />
        <Route
          path="/home"
          element={
            <ProtectedRoute>
              <HomePage />
            </ProtectedRoute>
          }
        />

        {/* ========== SHORT LINKS (for sharing) ========== */}
        <Route
          path="/c/:conversationId"
          element={
            <ProtectedRoute>
              <ConversationRedirect />
            </ProtectedRoute>
          }
        />
        <Route
          path="/c/:conversationId/m/:messageId"
          element={
            <ProtectedRoute>
              <ConversationRedirect />
            </ProtectedRoute>
          }
        />

        {/* ========== DOCUMENTATION ========== */}
        <Route
          path="/docs"
          element={
            <ProtectedRoute>
              <React.Suspense fallback={null}>
                <DocsPage />
              </React.Suspense>
            </ProtectedRoute>
          }
        />
        <Route
          path="/docs/*"
          element={
            <ProtectedRoute>
              <React.Suspense fallback={null}>
                <DocsPage />
              </React.Suspense>
            </ProtectedRoute>
          }
        />
        <Route
          path="/api-docs"
          element={
            <ProtectedRoute>
              <React.Suspense fallback={null}>
                <ApiDocsPage />
              </React.Suspense>
            </ProtectedRoute>
          }
        />

        {/* Global Search */}
        <Route
          path="/search"
          element={
            <ProtectedRoute>
              <SearchPage />
            </ProtectedRoute>
          }
        />

        {/* ========== NOTIFICATIONS ========== */}
        <Route path="/notifications" element={<Navigate to="/notifications/unread" replace />} />
        <Route
          path="/notifications/:tab"
          element={
            <ProtectedRoute>
              <NotificationsPage />
            </ProtectedRoute>
          }
        />

        {/* ========== INTERACTIONS ========== */}
        <Route path="/interactions" element={<Navigate to="/interactions/text/open" replace />} />
        <Route
          path="/interactions/text"
          element={<Navigate to="/interactions/text/open" replace />}
        />
        {/* Conversation resource routes (must be before :filter to avoid conflicts) */}
        <Route
          path="/interactions/text/conversations/:conversationId"
          element={
            <ProtectedRoute>
              <Index />
            </ProtectedRoute>
          }
        />
        <Route
          path="/interactions/text/:filter"
          element={
            <ProtectedRoute>
              <Index />
            </ProtectedRoute>
          }
        />
        {/* Chat - Dedicated live chat section */}
        <Route
          path="/interactions/chat"
          element={<Navigate to="/interactions/chat/active" replace />}
        />
        <Route
          path="/interactions/chat/conversations/:conversationId"
          element={
            <ProtectedRoute>
              <Index />
            </ProtectedRoute>
          }
        />
        <Route
          path="/interactions/chat/:filter"
          element={
            <ProtectedRoute>
              <Index />
            </ProtectedRoute>
          }
        />
        {/* Voice */}
        <Route
          path="/interactions/voice"
          element={
            <ProtectedRoute>
              <Index />
            </ProtectedRoute>
          }
        />
        <Route
          path="/interactions/voice/analytics"
          element={
            <ProtectedRoute>
              <Index />
            </ProtectedRoute>
          }
        />
        <Route
          path="/interactions/voice/settings"
          element={
            <ProtectedRoute>
              <Index />
            </ProtectedRoute>
          }
        />

        {/* Legacy voice redirects */}
        <Route path="/voice" element={<Navigate to="/interactions/voice" replace />} />
        <Route
          path="/voice/analytics"
          element={<Navigate to="/interactions/voice/analytics" replace />}
        />
        <Route
          path="/voice/settings"
          element={<Navigate to="/interactions/voice/settings" replace />}
        />

        {/* ========== MARKETING ========== */}
        <Route path="/marketing" element={<Navigate to="/marketing/campaigns" replace />} />
        <Route
          path="/marketing/campaigns"
          element={
            <ProtectedRoute>
              <Index />
            </ProtectedRoute>
          }
        />
        <Route
          path="/marketing/newsletters"
          element={
            <ProtectedRoute>
              <Index />
            </ProtectedRoute>
          }
        />

        {/* ========== OPERATIONS ========== */}
        <Route path="/operations" element={<Navigate to="/operations/cases" replace />} />
        <Route
          path="/operations/cases"
          element={
            <ProtectedRoute>
              <CasesPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/operations/case-reports"
          element={
            <ProtectedRoute>
              <CaseReportsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/operations/cases/:id"
          element={
            <ProtectedRoute>
              <CaseDetailPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/customers"
          element={
            <ProtectedRoute>
              <CustomersPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/customers/:id"
          element={
            <ProtectedRoute>
              <CustomerDetailPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/operations/tickets"
          element={
            <ProtectedRoute>
              <Index />
            </ProtectedRoute>
          }
        />
        <Route
          path="/operations/tickets/:id"
          element={
            <ProtectedRoute>
              <Index />
            </ProtectedRoute>
          }
        />
        <Route
          path="/operations/recruitment"
          element={
            <ProtectedRoute>
              <Index />
            </ProtectedRoute>
          }
        />
        <Route
          path="/operations/recruitment/pipeline"
          element={
            <ProtectedRoute>
              <Index />
            </ProtectedRoute>
          }
        />
        <Route
          path="/operations/recruitment/applicants"
          element={
            <ProtectedRoute>
              <Index />
            </ProtectedRoute>
          }
        />
        <Route
          path="/operations/recruitment/applicants/:id"
          element={
            <ProtectedRoute>
              <Index />
            </ProtectedRoute>
          }
        />
        <Route
          path="/operations/recruitment/positions"
          element={
            <ProtectedRoute>
              <Index />
            </ProtectedRoute>
          }
        />
        <Route
          path="/operations/recruitment/positions/:id"
          element={
            <ProtectedRoute>
              <Index />
            </ProtectedRoute>
          }
        />

        <Route
          path="/operations/analytics"
          element={
            <ProtectedRoute>
              <Index />
            </ProtectedRoute>
          }
        />
        <Route
          path="/operations/bulk-outreach"
          element={
            <ProtectedRoute>
              <Index />
            </ProtectedRoute>
          }
        />

        {/* Legacy operations redirects */}
        <Route
          path="/operations/service-tickets"
          element={<Navigate to="/operations/tickets" replace />}
        />

        {/* ========== SETTINGS (Personal) ========== */}
        <Route
          path="/settings"
          element={
            <ProtectedRoute>
              <Settings />
            </ProtectedRoute>
          }
        />
        <Route path="/settings/general" element={<Navigate to="/settings" replace />} />
        <Route
          path="/settings/profile"
          element={
            <ProtectedRoute>
              <Settings />
            </ProtectedRoute>
          }
        />
        <Route
          path="/settings/notifications"
          element={
            <ProtectedRoute>
              <Settings />
            </ProtectedRoute>
          }
        />
        <Route
          path="/settings/tags"
          element={
            <ProtectedRoute>
              <Settings />
            </ProtectedRoute>
          }
        />
        <Route
          path="/settings/email-templates"
          element={
            <ProtectedRoute>
              <Settings />
            </ProtectedRoute>
          }
        />

        {/* ========== ADMIN ========== */}
        <Route
          path="/admin"
          element={
            <ProtectedRoute>
              <AdminRoute>
                <Settings />
              </AdminRoute>
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/general"
          element={
            <ProtectedRoute>
              <AdminRoute>
                <Settings />
              </AdminRoute>
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/email-design"
          element={<Navigate to="/settings/email-templates" replace />}
        />
        <Route path="/admin/departments" element={<Navigate to="/admin/users" replace />} />
        <Route path="/settings/departments" element={<Navigate to="/admin/users" replace />} />
        <Route
          path="/admin/users"
          element={
            <ProtectedRoute>
              <AdminRoute>
                <Settings />
              </AdminRoute>
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/inboxes"
          element={
            <ProtectedRoute>
              <AdminRoute>
                <Settings />
              </AdminRoute>
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/inboxes/:inboxId"
          element={
            <ProtectedRoute>
              <AdminRoute>
                <Settings />
              </AdminRoute>
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/integrations"
          element={
            <ProtectedRoute>
              <AdminRoute>
                <Settings />
              </AdminRoute>
            </ProtectedRoute>
          }
        />
        <Route path="/admin/voice" element={<Navigate to="/admin/integrations" replace />} />
        <Route
          path="/admin/design"
          element={
            <ProtectedRoute>
              <AdminRoute>
                <Settings />
              </AdminRoute>
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/design/components"
          element={
            <ProtectedRoute>
              <AdminRoute>
                <AdminDesignComponentsPage />
              </AdminRoute>
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/feature-flags"
          element={
            <ProtectedRoute>
              <AdminRoute>
                <Settings />
              </AdminRoute>
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/health"
          element={
            <ProtectedRoute>
              <AdminRoute>
                <Settings />
              </AdminRoute>
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/edge-functions"
          element={
            <ProtectedRoute>
              <AdminRoute>
                <Settings />
              </AdminRoute>
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/import"
          element={
            <ProtectedRoute>
              <AdminRoute>
                <Settings />
              </AdminRoute>
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/knowledge"
          element={
            <ProtectedRoute>
              <AdminRoute>
                <KnowledgeManagement />
              </AdminRoute>
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/ai-chatbot"
          element={
            <ProtectedRoute>
              <AdminRoute>
                <Settings />
              </AdminRoute>
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/widget"
          element={
            <ProtectedRoute>
              <AdminRoute>
                <Settings />
              </AdminRoute>
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/recruitment"
          element={
            <ProtectedRoute>
              <AdminRoute>
                <Settings />
              </AdminRoute>
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/recruitment/import"
          element={
            <ProtectedRoute>
              <AdminRoute>
                <Settings />
              </AdminRoute>
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/recruitment/templates/:id"
          element={
            <ProtectedRoute>
              <AdminRoute>
                <Settings />
              </AdminRoute>
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/gdpr"
          element={
            <ProtectedRoute>
              <AdminRoute>
                <GdprDashboardPage />
              </AdminRoute>
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/background-jobs"
          element={
            <ProtectedRoute>
              <AdminRoute>
                <BackgroundJobsPage />
              </AdminRoute>
            </ProtectedRoute>
          }
        />

        {/* ========== SUPER ADMIN ========== */}
        <Route path="/super-admin" element={<Navigate to="/super-admin/dashboard" replace />} />
        <Route
          path="/super-admin/dashboard"
          element={
            <ProtectedRoute>
              <SuperAdminRoute>
                <SuperAdminDashboard />
              </SuperAdminRoute>
            </ProtectedRoute>
          }
        />
        <Route
          path="/super-admin/email-templates"
          element={
            <ProtectedRoute>
              <SuperAdminRoute>
                <SuperAdminEmailTemplates />
              </SuperAdminRoute>
            </ProtectedRoute>
          }
        />
        <Route
          path="/super-admin/organizations"
          element={
            <ProtectedRoute>
              <SuperAdminRoute>
                <OrganizationManagement />
              </SuperAdminRoute>
            </ProtectedRoute>
          }
        />
        <Route
          path="/super-admin/organizations/:id"
          element={
            <ProtectedRoute>
              <SuperAdminRoute>
                <OrganizationDetails />
              </SuperAdminRoute>
            </ProtectedRoute>
          }
        />
        <Route
          path="/super-admin/users"
          element={
            <ProtectedRoute>
              <SuperAdminRoute>
                <AllUsersManagement />
              </SuperAdminRoute>
            </ProtectedRoute>
          }
        />
        <Route
          path="/super-admin/import"
          element={
            <ProtectedRoute>
              <SuperAdminRoute>
                <SuperAdminImport />
              </SuperAdminRoute>
            </ProtectedRoute>
          }
        />
        <Route
          path="/super-admin/roles"
          element={
            <ProtectedRoute>
              <SuperAdminRoute>
                <RoleManagement />
              </SuperAdminRoute>
            </ProtectedRoute>
          }
        />
        <Route
          path="/super-admin/audit-logs"
          element={
            <ProtectedRoute>
              <SuperAdminRoute>
                <AuditLogs />
              </SuperAdminRoute>
            </ProtectedRoute>
          }
        />
        <Route
          path="/super-admin/audit-logs/analytics"
          element={
            <ProtectedRoute>
              <SuperAdminRoute>
                <AuditLogAnalytics />
              </SuperAdminRoute>
            </ProtectedRoute>
          }
        />
        <Route
          path="/super-admin/analytics"
          element={
            <ProtectedRoute>
              <SuperAdminRoute>
                <SystemAnalytics />
              </SuperAdminRoute>
            </ProtectedRoute>
          }
        />
        <Route
          path="/super-admin/recruitment/field-types"
          element={
            <ProtectedRoute>
              <SuperAdminRoute>
                <FieldTypesPage />
              </SuperAdminRoute>
            </ProtectedRoute>
          }
        />
        <Route
          path="/super-admin/recruitment/templates"
          element={
            <ProtectedRoute>
              <SuperAdminRoute>
                <SystemTemplatesPage />
              </SuperAdminRoute>
            </ProtectedRoute>
          }
        />
        <Route
          path="/super-admin/recruitment/templates/:id"
          element={
            <ProtectedRoute>
              <SuperAdminRoute>
                <SystemTemplateEditorPage />
              </SuperAdminRoute>
            </ProtectedRoute>
          }
        />

        {/* Static Pages */}
        <Route
          path="/privacy"
          element={
            <ProtectedRoute>
              <Privacy />
            </ProtectedRoute>
          }
        />
        <Route
          path="/terms"
          element={
            <ProtectedRoute>
              <Terms />
            </ProtectedRoute>
          }
        />

        {/* Catch-all */}
        <Route
          path="*"
          element={
            <ProtectedRoute>
              <NotFound />
            </ProtectedRoute>
          }
        />
      </Routes>
    </URLSanitizer>
  )
}

/**
 * Aircall Workspace Manager
 * Manages workspace visibility via context methods and renders the login modal
 */
const AircallWorkspaceManager = () => {
  const {
    showLoginModal,
    isConnected,
    handleManualLoginConfirm,
    skipPhoneIntegration,
    initializationPhase,
    showAircallWorkspace,
    hideAircallWorkspace,
    workspaceVisible,
    currentCall,
    isWorkspaceReady,
  } = useAircallPhone()

  React.useEffect(() => {
    if (showLoginModal) {
      showAircallWorkspace()
    } else if (!isConnected && initializationPhase === "idle") {
      if (import.meta.env.MODE !== "production") {
        console.log("[App] 🙈 Hiding workspace:", {
          isConnected,
          showLoginModal,
          initializationPhase,
        })
      }
      hideAircallWorkspace()
    }
  }, [showLoginModal, isConnected, initializationPhase, showAircallWorkspace, hideAircallWorkspace])

  return (
    <>
      <AircallLoginModal
        isOpen={showLoginModal}
        isConnected={isConnected}
        onLoginConfirm={handleManualLoginConfirm}
        onSkip={skipPhoneIntegration}
        initializationPhase={initializationPhase}
      />
      <AircallFloatingButton
        isConnected={isConnected}
        workspaceVisible={workspaceVisible}
        showAircallWorkspace={showAircallWorkspace}
        hideAircallWorkspace={hideAircallWorkspace}
        currentCall={currentCall}
        isWorkspaceReady={isWorkspaceReady}
      />
    </>
  )
}

const App = () => (
  <GlobalErrorBoundary suppressAnalyticsErrors suppressIframeErrors>
    <ErrorBoundary>
      <PersistQueryClientProvider
        client={queryClient}
        persistOptions={{
          persister,
          buster: "v2", // Invalidates old cache to clear any corrupted pending queries
          dehydrateOptions: {
            shouldDehydrateQuery: (query) => {
              // Only persist queries that:
              // 1. Have successfully resolved (status === 'success')
              // 2. Have actual data
              // 3. Are NOT currently fetching (fetchStatus === 'idle')
              // This prevents CancelledError spam when refetching queries are cancelled
              return (
                query.state.status === "success" &&
                query.state.data !== undefined &&
                query.state.fetchStatus === "idle"
              )
            },
          },
        }}
      >
        <BrowserRouter>
          <AuthProvider>
            <FeatureFlagsProvider>
              <RealtimeProvider>
                <ConversationPresenceProvider>
                  <ErrorBoundary fallback={<AppErrorFallback />}>
                    <AircallProvider>
                      <DesignSystemProvider>
                        <TooltipProvider>
                          <I18nWrapper>
                            <ComposeProvider>
                              <EnvBanner />
                              <ObservabilityBridge />
                              <AppContent />
                              {/* Aircall Workspace Manager - Controls container visibility */}
                              <AircallWorkspaceManager />
                              {/* Gmail-style compose windows docked at the bottom */}
                              <ComposeDock />
                            </ComposeProvider>
                          </I18nWrapper>

                          <Toaster />
                          <Sonner />
                        </TooltipProvider>
                      </DesignSystemProvider>
                    </AircallProvider>
                  </ErrorBoundary>
                </ConversationPresenceProvider>
              </RealtimeProvider>
            </FeatureFlagsProvider>
          </AuthProvider>
        </BrowserRouter>
      </PersistQueryClientProvider>
    </ErrorBoundary>
  </GlobalErrorBoundary>
)

export default App
