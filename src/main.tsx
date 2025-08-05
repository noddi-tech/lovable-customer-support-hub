import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter } from "react-router-dom";
import App from "./App.tsx";
import "./index.css";
import { AuthProvider } from "./components/auth/AuthContext";
import { DesignSystemProvider } from "./contexts/DesignSystemContext";

const queryClient = new QueryClient();

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <DesignSystemProvider>
          <BrowserRouter>
            <App />
          </BrowserRouter>
        </DesignSystemProvider>
      </AuthProvider>
    </QueryClientProvider>
  </StrictMode>
);
