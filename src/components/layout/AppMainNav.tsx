import { Bell, ChevronLeft, ChevronRight, Crown, Home, LogOut, User } from "lucide-react"
import { useEffect } from "react"
import { useTranslation } from "react-i18next"
import { NavLink, useLocation, useNavigate } from "react-router-dom"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar"
import { SidebarCounter } from "@/components/ui/sidebar-counter"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { useAuth } from "@/hooks/useAuth"
import { useDateFormatting } from "@/hooks/useDateFormatting"
import { useOptimizedCounts } from "@/hooks/useOptimizedCounts"
import { usePermissions } from "@/hooks/usePermissions"
import { useSidebarNavCounts } from "@/hooks/useSidebarNavCounts"
import { cn } from "@/lib/utils"
import { getGroupedNavItems, logNavMatch } from "@/navigation/nav-config"
import { AgentAvailabilityPanel } from "./AgentAvailabilityPanel"

/**
 * Once the nav has rendered with resolved permissions we never show the
 * "Loading..." shell again. Page routes each mount their own layout, so the
 * sidebar remounts on every navigation — without this flag it would blank out
 * for a moment on each route change.
 */
let navHasResolvedOnce = false

/**
 * Hover hint explaining what a nav entry is for. Skipped when the sidebar is
 * collapsed — SidebarMenuButton already renders its own label tooltip there.
 *
 * Defined at module scope on purpose: declaring it inside AppMainNav would make
 * React see a brand new component type on every render and remount the whole
 * nav link, which swallowed clicks.
 */
const NavHint = ({
  title,
  description,
  disabled,
  children,
}: {
  title: string
  description?: string
  disabled?: boolean
  children: React.ReactNode
}) => {
  if (!description || disabled) return <>{children}</>
  return (
    <Tooltip delayDuration={350}>
      <TooltipTrigger asChild>{children}</TooltipTrigger>
      <TooltipContent side="right" align="start" className="max-w-[260px]">
        <p className="text-xs font-medium">{title}</p>
        <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
      </TooltipContent>
    </Tooltip>
  )
}

export const AppMainNav = () => {
  const location = useLocation()
  const navigate = useNavigate()
  const { t } = useTranslation()
  const { state, toggleSidebar, isMobile, setOpenMobile, setOpen } = useSidebar()
  const { isAdmin: checkIsAdmin, isLoading: permissionsLoading } = usePermissions()
  const { user, profile, signOut, isSuperAdmin } = useAuth()
  const { notifications: unreadNotifications } = useOptimizedCounts()
  const navCounts = useSidebarNavCounts()
  const { dateTime, timezone } = useDateFormatting()

  const isCollapsed = state === "collapsed" && !isMobile
  const isAdmin = checkIsAdmin()
  const groupedItems = getGroupedNavItems(isAdmin, isSuperAdmin)
  const showLoadingShell = permissionsLoading && !navHasResolvedOnce

  useEffect(() => {
    if (!permissionsLoading) navHasResolvedOnce = true
  }, [permissionsLoading])

  // Log nav matches in dev mode
  useEffect(() => {
    logNavMatch(location.pathname)
  }, [location.pathname])

  const isActive = (path: string) => {
    if (path === "/interactions/text") {
      return (
        location.pathname === "/interactions/text" ||
        location.pathname.startsWith("/interactions/text/")
      )
    }
    if (path === "/interactions/voice") {
      return (
        location.pathname === "/interactions/voice" ||
        location.pathname.startsWith("/interactions/voice/")
      )
    }
    return location.pathname === path || location.pathname.startsWith(`${path}/`)
  }

  const getNavClassName = (isItemActive: boolean) =>
    cn(isItemActive ? "bg-muted text-primary font-medium" : "hover:bg-muted/50")

  const handleNavClick = () => {
    // Only auto-close the mobile drawer (it overlays content).
    // On desktop the sidebar stays as the user left it.
    if (isMobile) {
      setOpenMobile(false)
    }
  }

  const groupLabels: Record<string, string> = {
    notifications: t("navigation.notifications", "Notifications"),
    support: t("navigation.support", "Support"),
    interactions: t("navigation.interactions", "Interactions"),
    marketing: t("navigation.marketing", "Marketing"),
    operations: t("navigation.operations", "Operations"),
    settings: t("navigation.settings", "Settings"),
    admin: t("navigation.admin", "Admin"),
    super_admin: t("navigation.superAdmin", "Super Admin"),
  }

  const groupOrder = [
    "notifications",
    "support",
    "interactions",
    "marketing",
    "operations",
    "settings",
    "admin",
    "super_admin",
  ]

  const handleSignOut = async () => {
    try {
      await signOut()
      navigate("/auth")
    } catch (error) {
      console.error("Error signing out:", error)
    }
  }


  if (showLoadingShell) {
    return (
      <Sidebar collapsible="offcanvas">
        <SidebarContent>
          <div className="p-4 text-sm text-muted-foreground">Loading...</div>
        </SidebarContent>
      </Sidebar>
    )
  }

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="px-2 py-2 space-y-2">
        {!isCollapsed && (
          <h2 className="px-2 text-lg font-semibold text-foreground">Support Hub</h2>
        )}

        {/* Collapse toggle */}
        <div
          className={cn("flex items-center", isCollapsed ? "justify-center" : "justify-between")}
        >
          {!isCollapsed && (
            <span className="pl-2 text-[10px] leading-tight text-sidebar-foreground/50">
              Close sidebar · Cmd/Ctrl + B
            </span>
          )}
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleSidebar}
            title="Toggle sidebar (Cmd/Ctrl + B)"
            aria-label="Toggle sidebar"
            className="h-7 w-7 shrink-0"
          >
            {isCollapsed ? (
              <ChevronRight className="h-4 w-4" />
            ) : (
              <ChevronLeft className="h-4 w-4" />
            )}
          </Button>
        </div>

        <SidebarMenu>
          <SidebarMenuItem>
            <NavHint
              disabled={isCollapsed || isMobile}
              title="Home"
              description="Overview dashboard with today's activity and quick links to every area."
            >
              <SidebarMenuButton asChild tooltip="Home">
                <NavLink to="/home" onClick={handleNavClick} className="hover:bg-muted/50">
                  <Home className="mr-2 h-4 w-4" />
                  {!isCollapsed && <span className="font-semibold">Home</span>}
                </NavLink>
              </SidebarMenuButton>
            </NavHint>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent>
        {groupOrder.map((groupKey) => {
          const items = groupedItems[groupKey as keyof typeof groupedItems]
          if (!items || items.length === 0) return null
          if (groupKey === "admin" && !isAdmin) return null
          if (groupKey === "super_admin" && !isSuperAdmin) return null

          return (
            <SidebarGroup key={groupKey}>
              {groupKey !== "notifications" && (
                <SidebarGroupLabel
                  className={cn(
                    groupKey === "super_admin" &&
                      "text-yellow-600 dark:text-yellow-500 font-semibold",
                  )}
                >
                  {groupKey === "super_admin" && <Crown className="inline h-4 w-4 mr-1" />}
                  {groupLabels[groupKey as keyof typeof groupLabels]}
                </SidebarGroupLabel>
              )}

              <SidebarGroupContent>
                <SidebarMenu>
                  {items.map((item) => {
                    const Icon = item.icon
                    const itemIsActive = isActive(item.to)
                    const badgeCount =
                      item.id === "notifications"
                        ? unreadNotifications
                        : item.id === "text"
                          ? navCounts.text
                          : item.id === "chat"
                            ? navCounts.chat
                            : item.id === "cases"
                              ? navCounts.cases
                              : 0
                    const showBadge = badgeCount > 0

                    return (
                      <SidebarMenuItem key={item.id}>
                        <NavHint
                          title={item.label}
                          description={item.description}
                          disabled={isCollapsed || isMobile}
                        >
                          <SidebarMenuButton asChild tooltip={item.label}>
                            <NavLink
                              to={item.to}
                              end={item.to === "/"}
                              onClick={handleNavClick}
                              className={cn(
                                getNavClassName(itemIsActive),
                                groupKey === "super_admin" &&
                                  itemIsActive &&
                                  "bg-yellow-500/10 text-yellow-600 dark:text-yellow-500 font-medium",
                              )}
                              {...(itemIsActive && { "aria-current": "page" })}
                            >
                              <Icon className="mr-2 h-4 w-4 shrink-0" />

                              {!isCollapsed && (
                                <span className="flex-1 flex items-center justify-between">
                                  <span>{item.label}</span>
                                  {showBadge && (
                                    <SidebarCounter count={badgeCount} variant="unread" />
                                  )}
                                </span>
                              )}
                            </NavLink>
                          </SidebarMenuButton>
                        </NavHint>
                      </SidebarMenuItem>
                    )
                  })}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          )
        })}
      </SidebarContent>

      <SidebarFooter className="mt-auto border-t border-sidebar-border py-2 space-y-1">
        {/* Chat / phone availability */}
        <AgentAvailabilityPanel collapsed={isCollapsed} />

        {/* Timezone row */}
        {!isCollapsed && (
          <div className="flex items-center justify-end px-3 py-1">
            <span className="text-[11px] text-muted-foreground truncate">
              {timezone} · {dateTime(new Date()).split(" ")[1] || ""}
            </span>
          </div>
        )}

        {/* User profile + dropdown */}
        <DropdownMenu modal={false}>
          <DropdownMenuTrigger asChild>
            <button
              className={cn(
                "flex items-center gap-2 w-full rounded-md px-3 py-2 hover:bg-muted/50 transition-colors text-left",
                isCollapsed && "justify-center px-0",
              )}
            >
              <Avatar className="h-7 w-7 shrink-0">
                <AvatarImage src={profile?.avatar_url || user?.user_metadata?.avatar_url} />
                <AvatarFallback className="text-xs">
                  {profile?.full_name?.[0] ||
                    user?.user_metadata?.full_name?.[0] ||
                    user?.email?.[0] ||
                    "U"}
                </AvatarFallback>
              </Avatar>
              {!isCollapsed && (
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium leading-tight truncate">
                    {profile?.full_name || user?.user_metadata?.full_name || "User"}
                  </p>
                  <p className="text-[11px] text-muted-foreground truncate">{user?.email}</p>
                </div>
              )}
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent side="top" align="start" className="w-56">
            <div className="flex flex-col space-y-1 p-2">
              <p className="text-sm font-medium leading-none">
                {profile?.full_name || user?.user_metadata?.full_name || "User"}
              </p>
              <p className="text-xs leading-none text-muted-foreground">{user?.email}</p>
            </div>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => navigate("/settings/profile")}>
              <User className="mr-2 h-4 w-4" />
              <span>{t("header.profile", "Profile")}</span>
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => navigate("/settings/notifications")}>
              <Bell className="mr-2 h-4 w-4" />
              <span>{t("header.notificationSettings", "Notification settings")}</span>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleSignOut}>
              <LogOut className="mr-2 h-4 w-4" />
              <span>{t("header.signOut", "Sign out")}</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Build / release info */}
        {!isCollapsed && (
          <div
            className="px-2 pt-0.5 text-center text-[9px] leading-tight text-sidebar-foreground/50 truncate"
            title={`Commit ${__APP_COMMIT__} · built ${__APP_BUILD_TIME__}`}
          >
            v{__APP_COMMIT__.slice(0, 7)} ·{" "}
            {new Intl.DateTimeFormat("en-GB", {
              dateStyle: "short",
              timeStyle: "short",
              timeZone: "Europe/Oslo",
            }).format(new Date(__APP_BUILD_TIME__))}
          </div>
        )}
      </SidebarFooter>
    </Sidebar>
  )
}
