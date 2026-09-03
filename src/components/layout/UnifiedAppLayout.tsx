import type React from "react"
import { useEffect, useState } from "react"
import { NewChatAlertBanner } from "@/components/live-chat/NewChatAlertBanner"
import { SearchCommandPalette } from "@/components/search/SearchCommandPalette"
import { SidebarProvider } from "@/components/ui/sidebar"
import { UIProbe } from "@/dev/UIProbe"
import { WhatsNewDialog } from "@/features/whats-new/WhatsNewDialog"
import { useDesktopEmailNotifications } from "@/hooks/useDesktopEmailNotifications"
import { useNotificationPermissionPrompt } from "@/hooks/useNotificationPermissionPrompt"
import { useOpenConversationsBadge } from "@/hooks/useOpenConversationsBadge"
import { useLocation, useNavigate } from "@/router/compat"
import { AppMainNav } from "./AppMainNav"
import { MobileBottomNav } from "./MobileBottomNav"
import { MobileEdgeSwipe } from "./MobileEdgeSwipe"
import { QuickInboxSwitcher } from "./QuickInboxSwitcher"

interface UnifiedAppLayoutProps {
  children: React.ReactNode
}

const SIDEBAR_PREF_KEY = "support-hub:sidebar-open"

export const UnifiedAppLayout: React.FC<UnifiedAppLayoutProps> = ({ children }) => {
  const [searchOpen, setSearchOpen] = useState(false)
  const [inboxSwitcherOpen, setInboxSwitcherOpen] = useState(false)
  const [sidebarOpen, setSidebarOpen] = useState<boolean>(() => {
    try {
      return localStorage.getItem(SIDEBAR_PREF_KEY) === "true"
    } catch {
      return false
    }
  })
  const location = useLocation()
  const navigate = useNavigate()
  const section = location.pathname.split("/").slice(0, 3).join("/")

  const handleSidebarOpenChange = (open: boolean) => {
    setSidebarOpen(open)
    try {
      localStorage.setItem(SIDEBAR_PREF_KEY, String(open))
    } catch {
      // ignore storage failures (private mode, etc.)
    }
  }

  // Ask for browser notification permission on first app open (top-level only)
  useNotificationPermissionPrompt()

  // Desktop notifications for newly arrived emails and chat messages
  useDesktopEmailNotifications()

  // Favicon / app badge with open conversations in the selected inbox
  useOpenConversationsBadge()

  // Global Cmd+K / Ctrl+K (search), Cmd+I (quick inbox switcher), Cmd+H (home)
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if ((e.key === "h" || e.key === "H") && (e.metaKey || e.ctrlKey)) {
        e.preventDefault()
        e.stopPropagation()
        setSearchOpen(false)
        setInboxSwitcherOpen(false)
        navigate("/")
        return
      }
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault()
        setSearchOpen((prev) => !prev)
      }
      if ((e.key === "i" || e.key === "I") && (e.metaKey || e.ctrlKey)) {
        e.preventDefault()
        setInboxSwitcherOpen((prev) => !prev)
      }
    }
    window.addEventListener("keydown", down, true)
    return () => window.removeEventListener("keydown", down, true)
  }, [navigate])

  return (
    <SidebarProvider open={sidebarOpen} onOpenChange={handleSidebarOpenChange}>
      {import.meta.env.DEV && import.meta.env.VITE_UI_PROBE === "1" && <UIProbe />}
      <SearchCommandPalette open={searchOpen} onOpenChange={setSearchOpen} />
      <QuickInboxSwitcher open={inboxSwitcherOpen} onOpenChange={setInboxSwitcherOpen} />
      <WhatsNewDialog />
      <NewChatAlertBanner />
      <MobileEdgeSwipe />

      <div className="h-svh flex w-full bg-background">
        {/* Sidebar Navigation */}
        <AppMainNav />

        {/* Main Content Area + phone tab bar */}
        <div className="flex min-w-0 flex-1 flex-col">
          <main className="flex-1 min-h-0 w-full max-w-none overflow-auto bg-background">
            <div key={section} className="h-full animate-fade-in">
              {children}
            </div>
          </main>
          <MobileBottomNav />
        </div>
      </div>
    </SidebarProvider>
  )
}
