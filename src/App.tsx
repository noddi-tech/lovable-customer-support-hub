import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { SidebarProvider } from "@/components/ui/sidebar";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/components/auth/AuthContext";
import { DesignSystemProvider } from "@/contexts/DesignSystemContext";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { I18nWrapper } from "@/components/i18n/I18nWrapper";
import Index from "./pages/Index";
import { Auth } from "./pages/Auth";
import Settings from "./pages/Settings";
import Privacy from "./pages/Privacy";
import Terms from "./pages/Terms";
import NotFound from "./pages/NotFound";
import "@/lib/i18n";

const queryClient = new QueryClient();

const AppContent = () => (
  <BrowserRouter>
    <Routes>
      <Route path="/auth" element={<Auth />} />
      <Route path="/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
      <Route path="/privacy" element={<ProtectedRoute><Privacy /></ProtectedRoute>} />
      <Route path="/terms" element={<ProtectedRoute><Terms /></ProtectedRoute>} />
      <Route path="/*" element={<ProtectedRoute><Index /></ProtectedRoute>} />
    </Routes>
  </BrowserRouter>
);

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <DesignSystemProvider>
        <SidebarProvider>
          <TooltipProvider>
            <I18nWrapper>
              <AppContent />
            </I18nWrapper>
            <Toaster />
            <Sonner />
          </TooltipProvider>
        </SidebarProvider>
      </DesignSystemProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
