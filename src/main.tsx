// =============================================================================
// URL SANITIZATION - MUST RUN BEFORE REACT INITIALIZES
// Fixes malformed URLs like /%3Finbox=... which should be /?inbox=...
// =============================================================================
let __REDIRECTING__ = false;

(function fixMalformedUrl() {
  const pathname = window.location.pathname;
  if (pathname.includes('%3F') || pathname.includes('%3f')) {
    try {
      const decoded = decodeURIComponent(pathname);
      const queryStart = decoded.indexOf('?');
      if (queryStart !== -1) {
        const basePath = decoded.substring(0, queryStart) || '/';
        const queryString = decoded.substring(queryStart);
        const correctedUrl = basePath + queryString + window.location.hash;
        console.log('[main] Fixing malformed URL:', pathname, '→', correctedUrl);
        __REDIRECTING__ = true;
        window.location.replace(correctedUrl);
      }
    } catch (e) {
      console.error('[main] URL decode failed:', e);
    }
  }
})();

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
  queryClient.removeQueries({ queryKey: ['conversations'] });
  queryClient.removeQueries({ queryKey: ['inbox-counts'] });
  queryClient.removeQueries({ queryKey: ['all-counts'] });
});

window.addEventListener('voice-error-reset', () => {
  console.log('🔄 [VoiceErrorBoundary] Voice error reset triggered');
  queryClient.invalidateQueries({ queryKey: ['calls'] });
  queryClient.invalidateQueries({ queryKey: ['voicemails'] });
  queryClient.invalidateQueries({ queryKey: ['aircall'] });
});

// Only render React if we're not redirecting to fix malformed URL
if (!__REDIRECTING__) {
  createRoot(document.getElementById("root")!).render(
    import.meta.env.DEV ? (
      <StrictMode>
        <App />
      </StrictMode>
    ) : (
      <App />
    )
  );

  // Hide the static bootstrap screen now that React has mounted
  const bootstrap = document.getElementById('app-bootstrap');
  if (bootstrap) bootstrap.style.display = 'none';
  if ((window as any).__bootstrapTimer) clearTimeout((window as any).__bootstrapTimer);
}
