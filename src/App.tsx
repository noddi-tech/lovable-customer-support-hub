import { PersistQueryClientProvider } from "@tanstack/react-query-persist-client"
import { RouterProvider } from "@tanstack/react-router"
import React from "react"
import { AuthProvider } from "@/components/auth/AuthContext"
import { ComposeDock } from "@/components/dashboard/compose/ComposeDock"
import { AircallFloatingButton } from "@/components/dashboard/voice/AircallFloatingButton"
import { AircallLoginModal } from "@/components/dashboard/voice/AircallLoginModal"
import { EnvBanner } from "@/components/dev/EnvBanner"
import { AppErrorFallback } from "@/components/error/AppErrorFallback"
import { ErrorBoundary } from "@/components/error/ErrorBoundary"
import { GlobalErrorBoundary } from "@/components/error/GlobalErrorBoundary"
import { I18nWrapper } from "@/components/i18n/I18nWrapper"
import { ObservabilityBridge } from "@/components/observability/ObservabilityBridge"
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
import { router } from "@/router/router"
import "@/lib/i18n"
import "@/styles/controls.css"

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
              return (
                query.state.status === "success" &&
                query.state.data !== undefined &&
                query.state.fetchStatus === "idle"
              )
            },
          },
        }}
      >
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
                            <RouterProvider router={router} />
                            <AircallWorkspaceManager />
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
      </PersistQueryClientProvider>
    </ErrorBoundary>
  </GlobalErrorBoundary>
)

export default App
