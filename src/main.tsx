import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import App from "./App.tsx";
import "./index.css";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false, // Don't refetch when switching tabs
      staleTime: 5 * 60 * 1000, // 5 minutes - keep data fresh
      refetchOnMount: false, // Don't automatically refetch on mount
      retry: 1, // Only retry once on failures
      gcTime: 10 * 60 * 1000, // 10 minutes cache time
    },
  },
});

// Phase 5: Add global tab visibility logger
if (import.meta.env.DEV) {
  document.addEventListener('visibilitychange', () => {
    console.log('👁️ [TabVisibility]', document.hidden ? 'TAB HIDDEN' : 'TAB VISIBLE');
  });
}

// Phase 3: Listen for error boundary reset events
window.addEventListener('global-error-reset', () => {
  console.log('🔄 [ErrorBoundary] Global error reset triggered');
  queryClient.clear();
  queryClient.invalidateQueries();
});

window.addEventListener('voice-error-reset', () => {
  console.log('🔄 [VoiceErrorBoundary] Voice error reset triggered');
  queryClient.invalidateQueries({ queryKey: ['calls'] });
  queryClient.invalidateQueries({ queryKey: ['voicemails'] });
  queryClient.invalidateQueries({ queryKey: ['aircall'] });
});

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <App />
      <ReactQueryDevtools initialIsOpen={false} />
    </QueryClientProvider>
  </StrictMode>
);
