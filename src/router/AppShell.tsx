import { Outlet } from "@tanstack/react-router"
import { useEffect } from "react"
import { ObservabilityBridge } from "@/components/observability/ObservabilityBridge"
import { URLSanitizer } from "@/components/routing/URLSanitizer"
import { useNavigate } from "@/router/compat"

/** Root shell: URL sanitization + global keyboard / auth navigation hooks. */
export function AppShell() {
  const navigate = useNavigate()

  useEffect(() => {
    if (import.meta.env.MODE !== "production") {
      const logNavigation = () => {
        console.log("🚀 [Navigation] Page changed to:", window.location.pathname)
      }
      window.addEventListener("popstate", logNavigation)
      return () => window.removeEventListener("popstate", logNavigation)
    }
  }, [])

  useEffect(() => {
    const handleAuthNavigate = (event: CustomEvent<{ path: string }>) => {
      if (import.meta.env.MODE !== "production") {
        console.log("🚀 [App] Auth navigation event received:", event.detail.path)
      }
      navigate(event.detail.path, { replace: true })
    }

    window.addEventListener("auth-navigate", handleAuthNavigate)
    return () => window.removeEventListener("auth-navigate", handleAuthNavigate)
  }, [navigate])

  useEffect(() => {
    const handleBack = (e: KeyboardEvent) => {
      if (e.key !== "Backspace" && e.key !== "Delete") return
      if (e.metaKey || e.ctrlKey || e.altKey) return

      const target = e.target as HTMLElement | null
      if (
        target &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.tagName === "SELECT" ||
          target.isContentEditable ||
          target.closest('[contenteditable="true"]'))
      ) {
        return
      }

      if (
        document.querySelector(
          '[role="dialog"], [role="alertdialog"], [data-radix-popper-content-wrapper]',
        )
      ) {
        return
      }

      e.preventDefault()
      const idx = (window.history.state as { idx?: number } | null)?.idx ?? 0
      if (idx > 0) navigate(-1)
      else navigate("/home")
    }

    window.addEventListener("keydown", handleBack)
    return () => window.removeEventListener("keydown", handleBack)
  }, [navigate])

  return (
    <URLSanitizer>
      {/* Must sit under RouterProvider so useLocation / page-view tracking work. */}
      <ObservabilityBridge />
      <Outlet />
    </URLSanitizer>
  )
}
