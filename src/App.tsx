import { Toaster } from "@/components/ui/toaster";
import { GlobalErrorBoundary } from "@/components/error/GlobalErrorBoundary";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client';
import { queryClient, persister } from '@/lib/persistedQueryClient';
import { AuthProvider } from "@/components/auth/AuthContext";
import { AircallProvider } from "@/contexts/AircallContext";
import { DesignSystemProvider } from "@/contexts/DesignSystemContext";
import { RealtimeProvider } from "@/contexts/RealtimeProvider";
import { ConversationPresenceProvider } from "@/contexts/ConversationPresenceContext";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { AdminRoute } from "@/components/auth/AdminRoute";
import { SuperAdminRoute } from "@/components/auth/SuperAdminRoute";
import { I18nWrapper } from "@/components/i18n/I18nWrapper";
import { ErrorBoundary } from "@/components/error/ErrorBoundary";
import { ControlDoctor } from "@/dev/ControlDoctor";
import { useAircallPhone } from "@/hooks/useAircallPhone";
import { AircallLoginModal } from "@/components/dashboard/voice/AircallLoginModal";
import { AircallFloatingButton } from "@/components/dashboard/voice/AircallFloatingButton";
import { AircallErrorFallback } from "@/components/dashboard/voice/AircallErrorFallback";
import { PerformanceDebugPanel } from "@/components/debug/PerformanceDebugPanel";
import { URLSanitizer } from "@/components/routing/URLSanitizer";
import React, { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Index from "./pages/Index";
import { Auth } from "./pages/Auth";
import Settings from "./pages/Settings";
import NotificationsPage from "./pages/NotificationsPage";
import AdminDesignComponentsPage from "./pages/AdminDesignComponentsPage";
import KnowledgeManagement from "./pages/KnowledgeManagement";
import SuperAdminDashboard from "./pages/SuperAdminDashboard";
import SuperAdminEmailTemplates from "./pages/SuperAdminEmailTemplates";
import OrganizationManagement from "./pages/OrganizationManagement";
import OrganizationDetails from "./pages/OrganizationDetails";
import AllUsersManagement from "./pages/AllUsersManagement";
import SystemAnalytics from "./pages/SystemAnalytics";
import RoleManagement from "./pages/RoleManagement";
import AuditLogs from "./pages/AuditLogs";
import AuditLogAnalytics from "./pages/AuditLogAnalytics";
import Privacy from "./pages/Privacy";
import Terms from "./pages/Terms";
import NotFound from "./pages/NotFound";
import SuperAdminImport from "./pages/SuperAdminImport";
import SearchPage from "./pages/SearchPage";
import "@/lib/i18n";
import "@/styles/controls.css";

const AppContent = () => {
  const navigate = useNavigate();
  
  // Navigation interceptor - DEV only
  useEffect(() => {
    if (import.meta.env.MODE !== 'production') {
      const logNavigation = () => {
        console.log('🚀 [Navigation] Page changed to:', window.location.pathname);
      };
      window.addEventListener('popstate', logNavigation);
      return () => window.removeEventListener('popstate', logNavigation);
    }
  }, []);

  // Auth navigation events
  useEffect(() => {
    const handleAuthNavigate = (event: CustomEvent<{ path: string }>) => {
      if (import.meta.env.MODE !== 'production') {
        console.log('🚀 [App] Auth navigation event received:', event.detail.path);
      }
      navigate(event.detail.path, { replace: true });
    };
    
    window.addEventListener('auth-navigate', handleAuthNavigate as EventListener);
    return () => window.removeEventListener('auth-navigate', handleAuthNavigate as EventListener);
  }, [navigate]);

  // Emergency Escape Handler - Force close all dialogs/popovers
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        // Close all open popovers, dialogs, and dropdowns
        document.querySelectorAll('[data-state="open"]').forEach(el => {
          if (el.hasAttribute('data-radix-dialog-overlay') || 
              el.hasAttribute('data-radix-popover-content') ||
              el.hasAttribute('data-radix-dropdown-menu-content')) {
            const trigger = el.previousElementSibling;
            if (trigger) {
              (trigger as HTMLElement).click();
            }
          }
        });
      }
    };
    
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, []);

  return (
    <URLSanitizer>
    <Routes>
      <Route path="/auth" element={<Auth />} />
      
      {/* Global Search */}
      <Route path="/search" element={<ProtectedRoute><SearchPage /></ProtectedRoute>} />
      
      {/* Notifications */}
      <Route path="/notifications" element={<ProtectedRoute><NotificationsPage /></ProtectedRoute>} />

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
      
      {/* Voice Routes */}
      <Route path="/voice/analytics" element={<ProtectedRoute><Index /></ProtectedRoute>} />
      <Route path="/voice/settings" element={<ProtectedRoute><Index /></ProtectedRoute>} />
      
      {/* Admin Routes */}
      <Route path="/admin" element={<Navigate to="/admin/general" replace />} />
      <Route path="/admin/general" element={<ProtectedRoute><AdminRoute><Settings /></AdminRoute></ProtectedRoute>} />
      <Route path="/admin/email-design" element={<Navigate to="/settings/email-templates" replace />} />
      <Route path="/settings/email-templates" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
      <Route path="/admin/departments" element={<Navigate to="/admin/users" replace />} />
      <Route path="/settings/departments" element={<Navigate to="/admin/users" replace />} />
      <Route path="/admin/users" element={<ProtectedRoute><AdminRoute><Settings /></AdminRoute></ProtectedRoute>} />
      <Route path="/admin/inboxes" element={<ProtectedRoute><AdminRoute><Settings /></AdminRoute></ProtectedRoute>} />
      <Route path="/admin/integrations" element={<ProtectedRoute><AdminRoute><Settings /></AdminRoute></ProtectedRoute>} />
      <Route path="/admin/voice" element={<Navigate to="/admin/integrations" replace />} />
      <Route path="/admin/design" element={<ProtectedRoute><AdminRoute><Settings /></AdminRoute></ProtectedRoute>} />
      <Route path="/admin/design/components" element={<ProtectedRoute><AdminRoute><AdminDesignComponentsPage /></AdminRoute></ProtectedRoute>} />
      <Route path="/admin/debug" element={<ProtectedRoute><AdminRoute><Settings /></AdminRoute></ProtectedRoute>} />
      <Route path="/admin/import" element={<ProtectedRoute><AdminRoute><Settings /></AdminRoute></ProtectedRoute>} />
      <Route path="/admin/knowledge" element={<ProtectedRoute><AdminRoute><KnowledgeManagement /></AdminRoute></ProtectedRoute>} />
      
      {/* Super Admin Routes */}
      <Route path="/super-admin" element={<Navigate to="/super-admin/dashboard" replace />} />
      <Route path="/super-admin/dashboard" element={<ProtectedRoute><SuperAdminRoute><SuperAdminDashboard /></SuperAdminRoute></ProtectedRoute>} />
      <Route path="/super-admin/email-templates" element={<ProtectedRoute><SuperAdminRoute><SuperAdminEmailTemplates /></SuperAdminRoute></ProtectedRoute>} />
      <Route path="/super-admin/organizations" element={<ProtectedRoute><SuperAdminRoute><OrganizationManagement /></SuperAdminRoute></ProtectedRoute>} />
      <Route path="/super-admin/organizations/:id" element={<ProtectedRoute><SuperAdminRoute><OrganizationDetails /></SuperAdminRoute></ProtectedRoute>} />
      <Route path="/super-admin/users" element={<ProtectedRoute><SuperAdminRoute><AllUsersManagement /></SuperAdminRoute></ProtectedRoute>} />
      <Route path="/super-admin/import" element={<ProtectedRoute><SuperAdminRoute><SuperAdminImport /></SuperAdminRoute></ProtectedRoute>} />
            <Route path="/super-admin/roles" element={<ProtectedRoute><SuperAdminRoute><RoleManagement /></SuperAdminRoute></ProtectedRoute>} />
            <Route path="/super-admin/audit-logs" element={<ProtectedRoute><SuperAdminRoute><AuditLogs /></SuperAdminRoute></ProtectedRoute>} />
            <Route path="/super-admin/audit-logs/analytics" element={<ProtectedRoute><SuperAdminRoute><AuditLogAnalytics /></SuperAdminRoute></ProtectedRoute>} />
      <Route path="/super-admin/analytics" element={<ProtectedRoute><SuperAdminRoute><SystemAnalytics /></SuperAdminRoute></ProtectedRoute>} />
      
      {/* Static Pages */}
      <Route path="/privacy" element={<ProtectedRoute><Privacy /></ProtectedRoute>} />
      <Route path="/terms" element={<ProtectedRoute><Terms /></ProtectedRoute>} />
      
      {/* Catch-all */}
      <Route path="*" element={<ProtectedRoute><NotFound /></ProtectedRoute>} />
    </Routes>
    </URLSanitizer>
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
    currentCall,
    isWorkspaceReady
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
      if (import.meta.env.MODE !== 'production') {
        console.log('[App] 🙈 Hiding workspace:', { 
          isConnected, 
          showLoginModal, 
          initializationPhase 
        });
      }
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
          isWorkspaceReady={isWorkspaceReady}
        />
    </>
  );
};

const App = () => (
  <GlobalErrorBoundary suppressAnalyticsErrors suppressIframeErrors>
    <ErrorBoundary>
      <PersistQueryClientProvider client={queryClient} persistOptions={{ persister }}>
        <BrowserRouter>
          <AuthProvider>
            <RealtimeProvider>
              <ConversationPresenceProvider>
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
              </ConversationPresenceProvider>
            </RealtimeProvider>
          </AuthProvider>
        </BrowserRouter>
      </PersistQueryClientProvider>
    </ErrorBoundary>
  </GlobalErrorBoundary>
);

export default App;
