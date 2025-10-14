import { Toaster } from "@/components/ui/toaster";
import { GlobalErrorBoundary } from "@/components/error/GlobalErrorBoundary";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/components/auth/AuthContext";
import { AircallProvider } from "@/contexts/AircallContext";
import { DesignSystemProvider } from "@/contexts/DesignSystemContext";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { AdminRoute } from "@/components/auth/AdminRoute";
import { I18nWrapper } from "@/components/i18n/I18nWrapper";
import { ErrorBoundary } from "@/components/error/ErrorBoundary";
import { ControlDoctor } from "@/dev/ControlDoctor";
import { useAircallPhone } from "@/hooks/useAircallPhone";
import { AircallLoginModal } from "@/components/dashboard/voice/AircallLoginModal";
import { AircallFloatingButton } from "@/components/dashboard/voice/AircallFloatingButton";
import { AircallErrorFallback } from "@/components/dashboard/voice/AircallErrorFallback";
import React, { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Index from "./pages/Index";
import { Auth } from "./pages/Auth";
import Settings from "./pages/Settings";
import AdminDesignComponentsPage from "./pages/AdminDesignComponentsPage";
import Privacy from "./pages/Privacy";
import Terms from "./pages/Terms";
import NotFound from "./pages/NotFound";
import "@/lib/i18n";
import "@/styles/controls.css";

const AppContent = () => {
  const navigate = useNavigate();
  
  // Phase 5: Add navigation interceptor
  useEffect(() => {
    const logNavigation = () => {
      console.log('🚀 [Navigation] Page changed to:', window.location.pathname);
    };
    window.addEventListener('popstate', logNavigation);
    return () => window.removeEventListener('popstate', logNavigation);
  }, []);

  // Phase 1 & 2: Listen for auth navigation events
  useEffect(() => {
    const handleAuthNavigate = (event: CustomEvent<{ path: string }>) => {
      console.log('🚀 [App] Auth navigation event received:', event.detail.path);
      navigate(event.detail.path, { replace: true });
    };
    
    window.addEventListener('auth-navigate', handleAuthNavigate as EventListener);
    return () => window.removeEventListener('auth-navigate', handleAuthNavigate as EventListener);
  }, [navigate]);

  return (
    <>
    {import.meta.env.DEV && import.meta.env.VITE_UI_PROBE === '1' && <ControlDoctor />}
    <Routes>
      <Route path="/auth" element={<Auth />} />
      
      {/* Main App Routes - Interactions */}
      <Route path="/" element={<ProtectedRoute><Index /></ProtectedRoute>} />
      <Route path="/interactions/text" element={<Navigate to="/" replace />} />
      <Route path="/interactions/voice" element={<Navigate to="/voice" replace />} />
      <Route path="/voice" element={<ProtectedRoute><Index /></ProtectedRoute>} />
      
      {/* Marketing Routes */}
      <Route path="/marketing" element={<ProtectedRoute><Index /></ProtectedRoute>} />
      <Route path="/marketing/campaigns" element={<Navigate to="/marketing" replace />} />
      <Route path="/marketing/newsletters" element={<ProtectedRoute><Index /></ProtectedRoute>} />
      
      {/* Operations Routes */}
      <Route path="/operations" element={<ProtectedRoute><Index /></ProtectedRoute>} />
      <Route path="/operations/service-tickets" element={<Navigate to="/operations" replace />} />
      <Route path="/operations/doorman" element={<ProtectedRoute><Index /></ProtectedRoute>} />
      <Route path="/operations/recruitment" element={<ProtectedRoute><Index /></ProtectedRoute>} />
      <Route path="/operations/analytics" element={<ProtectedRoute><Index /></ProtectedRoute>} />
      <Route path="/operations/settings" element={<ProtectedRoute><Index /></ProtectedRoute>} />
      
      {/* Settings Routes */}
      <Route path="/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
      <Route path="/settings/general" element={<Navigate to="/settings" replace />} />
      <Route path="/settings/profile" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
      <Route path="/settings/notifications" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
      
      {/* Admin Routes */}
      <Route path="/admin" element={<Navigate to="/admin/general" replace />} />
      <Route path="/admin/general" element={<ProtectedRoute><AdminRoute><Settings /></AdminRoute></ProtectedRoute>} />
      <Route path="/admin/email-design" element={<ProtectedRoute><AdminRoute><Settings /></AdminRoute></ProtectedRoute>} />
      <Route path="/admin/departments" element={<ProtectedRoute><AdminRoute><Settings /></AdminRoute></ProtectedRoute>} />
      <Route path="/admin/users" element={<ProtectedRoute><AdminRoute><Settings /></AdminRoute></ProtectedRoute>} />
      <Route path="/admin/inboxes" element={<ProtectedRoute><AdminRoute><Settings /></AdminRoute></ProtectedRoute>} />
      <Route path="/admin/integrations" element={<ProtectedRoute><AdminRoute><Settings /></AdminRoute></ProtectedRoute>} />
      <Route path="/admin/voice" element={<ProtectedRoute><AdminRoute><Settings /></AdminRoute></ProtectedRoute>} />
      <Route path="/admin/design" element={<ProtectedRoute><AdminRoute><Settings /></AdminRoute></ProtectedRoute>} />
      <Route path="/admin/design/components" element={<ProtectedRoute><AdminRoute><AdminDesignComponentsPage /></AdminRoute></ProtectedRoute>} />
      
      {/* Static Pages */}
      <Route path="/privacy" element={<ProtectedRoute><Privacy /></ProtectedRoute>} />
      <Route path="/terms" element={<ProtectedRoute><Terms /></ProtectedRoute>} />
      
      {/* Catch-all */}
      <Route path="*" element={<ProtectedRoute><NotFound /></ProtectedRoute>} />
    </Routes>
    </>
  );
};

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
    currentCall
  } = useAircallPhone();
  
  // ============================================================================
  // Aircall Workspace Visibility Control
  // ============================================================================
  // CRITICAL: This useEffect controls workspace visibility ONLY for:
  // - Showing workspace when login modal is explicitly requested
  // - Hiding workspace when app is COMPLETELY IDLE (before any initialization)
  //
  // During initialization phases ('diagnostics', 'creating-workspace', 
  // 'workspace-ready', 'needs-login'), the AircallContext OWNS visibility control.
  //
  // DO NOT modify this logic without understanding the initialization lifecycle!
  // ============================================================================
  React.useEffect(() => {
    // Show workspace when login modal is open
    if (showLoginModal) {
      showAircallWorkspace();
    } 
    // Only hide if disconnected AND not in any initialization phase
    else if (!isConnected && initializationPhase === 'idle') {
      console.log('[App] 🙈 Hiding workspace:', { 
        isConnected, 
        showLoginModal, 
        initializationPhase 
      });
      hideAircallWorkspace();
    }
    // In all other states ('diagnostics', 'creating-workspace', 'workspace-ready', 'needs-login'),
    // let AircallContext control visibility
  }, [showLoginModal, isConnected, initializationPhase, showAircallWorkspace, hideAircallWorkspace]);
  
  // Render the login modal and floating button
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
          isWorkspaceReady={initializationPhase === 'workspace-ready'}
        />
    </>
  );
};

const App = () => (
  <GlobalErrorBoundary suppressAnalyticsErrors suppressIframeErrors>
    <ErrorBoundary>
      <BrowserRouter>
        <AuthProvider>
          <ErrorBoundary fallback={<AircallErrorFallback />}>
            <AircallProvider>
              <DesignSystemProvider>
                <TooltipProvider>
                  <I18nWrapper>
                    <AppContent />
                    {/* Aircall Workspace Manager - Controls container visibility */}
                    <AircallWorkspaceManager />
                  </I18nWrapper>
                  <Toaster />
                  <Sonner />
                </TooltipProvider>
              </DesignSystemProvider>
            </AircallProvider>
          </ErrorBoundary>
        </AuthProvider>
      </BrowserRouter>
    </ErrorBoundary>
  </GlobalErrorBoundary>
);

export default App;
