import { useCallback, useEffect, useState } from "react"
import { toast } from "sonner"
import { useAircallPhone } from "@/hooks/useAircallPhone"
import { useVoiceIntegrations } from "@/hooks/useVoiceIntegrations"
import { aircallPhone } from "@/integrations/aircall"

/**
 * Shared Aircall session state + login/logout handlers.
 * Used by the sidebar availability panel and the command palette so both
 * surfaces behave identically.
 */
export function usePhoneSession() {
  const { isConnected, isInitialized, openLoginModal, initializePhone, logout, error } =
    useAircallPhone()

  // A stored Aircall session means the user is logged in even if the SDK
  // connection is still (re)establishing or was blocked by the browser.
  const [storedLogin, setStoredLogin] = useState<boolean>(() => {
    try {
      return aircallPhone.getLoginStatus()
    } catch {
      return false
    }
  })

  useEffect(() => {
    const sync = () => {
      try {
        setStoredLogin(aircallPhone.getLoginStatus())
      } catch {
        /* ignore */
      }
    }
    sync()
    const interval = window.setInterval(sync, 5000)
    window.addEventListener("storage", sync)
    return () => {
      window.clearInterval(interval)
      window.removeEventListener("storage", sync)
    }
  }, [])

  const { getIntegrationByProvider, isLoading: integrationsLoading } = useVoiceIntegrations()
  const aircallConfig = getIntegrationByProvider("aircall")
  const isConfigured = Boolean(
    aircallConfig?.is_active && aircallConfig?.configuration?.aircallEverywhere?.enabled,
  )

  const login = useCallback(() => {
    if (!isInitialized) {
      void initializePhone()
      return
    }
    openLoginModal()
  }, [initializePhone, isInitialized, openLoginModal])

  const signOut = useCallback(() => {
    logout?.()
    setStoredLogin(false)
    toast.success("Logged out of phone system", {
      description: "You will not receive phone calls until you log in again",
    })
  }, [logout])

  return {
    isLoggedIn: isConnected || storedLogin,
    isConfigured,
    isLoading: integrationsLoading,
    error,
    login,
    logout: signOut,
  }
}
