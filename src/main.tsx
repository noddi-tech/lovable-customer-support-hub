import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { queryClient } from "./lib/persistedQueryClient";

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
  import.meta.env.DEV ? (
    <StrictMode>
      <App />
    </StrictMode>
  ) : (
    <App />
  )
);
