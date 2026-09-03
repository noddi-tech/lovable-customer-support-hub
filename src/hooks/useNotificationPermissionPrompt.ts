import { useEffect } from "react"
import {
  isDesktopEmailNotificationsEnabled,
  setDesktopEmailNotificationsEnabled,
} from "./useDesktopEmailNotifications"

const ASKED_KEY = "notification-permission-asked"

/**
 * Asks the browser for notification permission the first time the app is
 * opened on this device. Browsers block the prompt inside cross-origin
 * iframes (the Lovable preview), so it only runs at top level.
 */
export function useNotificationPermissionPrompt() {
  useEffect(() => {
    if (!("Notification" in window)) return
    if (window.top !== window.self) return
    if (Notification.permission !== "default") {
      // Keep the opt-in flag in sync when already granted
      if (
        Notification.permission === "granted" &&
        localStorage.getItem(ASKED_KEY) === "true" &&
        !isDesktopEmailNotificationsEnabled()
      ) {
        setDesktopEmailNotificationsEnabled(true)
      }
      return
    }
    if (localStorage.getItem(ASKED_KEY) === "true") return

    let cancelled = false
    const ask = async () => {
      localStorage.setItem(ASKED_KEY, "true")
      try {
        const result = await Notification.requestPermission()
        if (!cancelled && result === "granted") {
          setDesktopEmailNotificationsEnabled(true)
        }
      } catch {
        /* ignore */
      }
    }

    // Slight delay so it doesn't fight with initial render/auth
    const timer = window.setTimeout(() => {
      void ask()
    }, 1500)
    return () => {
      cancelled = true
      window.clearTimeout(timer)
    }
  }, [])
}
