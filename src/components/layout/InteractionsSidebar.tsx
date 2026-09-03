import { Archive, BarChart3, Inbox, MessageCircle, Phone, Plus, Settings } from "lucide-react"
import type React from "react"
import { useTranslation } from "react-i18next"
import { Button } from "@/components/ui/button"
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"
import { cn } from "@/lib/utils"
import { useLocation, useNavigate } from "@/router/compat"

export const InteractionsSidebar: React.FC = () => {
  const location = useLocation()
  const navigate = useNavigate()
  const { t } = useTranslation()

  const isActive = (path: string) => {
    return location.pathname === path || location.pathname.startsWith(`${path}/`)
  }

  const interactionItems = [
    {
      title: "Inbox",
      icon: Inbox,
      path: "/interactions/text",
      badge: undefined, // Will be dynamic later
    },
    {
      title: "Chat",
      icon: MessageCircle,
      path: "/interactions/chat",
      badge: undefined, // Will show live count
    },
    {
      title: "Voice Calls",
      icon: Phone,
      path: "/interactions/voice",
      badge: undefined,
    },
  ]

  const quickFilters = [
    {
      title: "All open",
      icon: Inbox,
      path: "/interactions/text#inbox",
    },
    {
      title: "Archive",
      icon: Archive,
      path: "/interactions/text#archive",
    },
  ]

  const voiceTools = [
    {
      title: "Voice Analytics",
      icon: BarChart3,
      path: "/interactions/voice/analytics",
    },
    {
      title: "Voice Settings",
      icon: Settings,
      path: "/interactions/voice/settings",
    },
  ]

  return (
    <Sidebar>
      <SidebarHeader className="border-b border-sidebar-border p-4">
        <Button className="w-full gap-2" onClick={() => navigate("/interactions/text?new=1")}>
          <Plus className="h-4 w-4" />
          New Conversation
        </Button>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Channels</SidebarGroupLabel>
          <SidebarMenu>
            {interactionItems.map((item) => {
              const Icon = item.icon
              const itemIsActive = isActive(item.path)

              return (
                <SidebarMenuItem key={item.path}>
                  <SidebarMenuButton asChild isActive={itemIsActive}>
                    <button
                      type="button"
                      onClick={() => navigate(item.path)}
                      className={cn(
                        "w-full justify-between gap-2",
                        itemIsActive && "bg-sidebar-accent text-sidebar-accent-foreground",
                      )}
                    >
                      <div className="flex items-center gap-2">
                        <Icon className="h-4 w-4" />
                        {item.title}
                      </div>
                      {item.badge && (
                        <span className="bg-primary text-primary-foreground text-xs px-2 py-1 rounded-full">
                          {item.badge}
                        </span>
                      )}
                    </button>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              )
            })}
          </SidebarMenu>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel>Quick Filters</SidebarGroupLabel>
          <SidebarMenu>
            {quickFilters.map((item) => {
              const Icon = item.icon
              const itemIsActive = location.pathname + location.hash === item.path

              return (
                <SidebarMenuItem key={item.path}>
                  <SidebarMenuButton asChild isActive={itemIsActive}>
                    <button
                      type="button"
                      onClick={() => navigate(item.path)}
                      className={cn(
                        "w-full justify-start gap-2",
                        itemIsActive && "bg-sidebar-accent text-sidebar-accent-foreground",
                      )}
                    >
                      <Icon className="h-4 w-4" />
                      {item.title}
                    </button>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              )
            })}
          </SidebarMenu>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel>Voice Tools</SidebarGroupLabel>
          <SidebarMenu>
            {voiceTools.map((item) => {
              const Icon = item.icon
              const itemIsActive = isActive(item.path)

              return (
                <SidebarMenuItem key={item.path}>
                  <SidebarMenuButton asChild isActive={itemIsActive}>
                    <button
                      type="button"
                      onClick={() => navigate(item.path)}
                      className={cn(
                        "w-full justify-start gap-2",
                        itemIsActive && "bg-sidebar-accent text-sidebar-accent-foreground",
                      )}
                    >
                      <Icon className="h-4 w-4" />
                      {item.title}
                    </button>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              )
            })}
          </SidebarMenu>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  )
}
