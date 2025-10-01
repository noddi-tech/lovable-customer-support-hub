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
import Index from "./pages/Index";
import { Auth } from "./pages/Auth";
import Settings from "./pages/Settings";
import AdminDesignComponentsPage from "./pages/AdminDesignComponentsPage";
import Privacy from "./pages/Privacy";
import Terms from "./pages/Terms";
import NotFound from "./pages/NotFound";
import "@/lib/i18n";
import "@/styles/controls.css";

const AppContent = () => (
  <BrowserRouter>
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
  </BrowserRouter>
);

const App = () => (
  <GlobalErrorBoundary suppressAnalyticsErrors suppressIframeErrors>
    <ErrorBoundary>
      <AuthProvider>
        <AircallProvider>
          <DesignSystemProvider>
            <TooltipProvider>
              <I18nWrapper>
                <AppContent />
              </I18nWrapper>
              <Toaster />
              <Sonner />
            </TooltipProvider>
          </DesignSystemProvider>
        </AircallProvider>
      </AuthProvider>
    </ErrorBoundary>
  </GlobalErrorBoundary>
);

export default App;
