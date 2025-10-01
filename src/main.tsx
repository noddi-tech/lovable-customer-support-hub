import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import { AircallProvider } from "./contexts/AircallContext";
import "./index.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <AircallProvider>
      <App />
    </AircallProvider>
  </StrictMode>
);
