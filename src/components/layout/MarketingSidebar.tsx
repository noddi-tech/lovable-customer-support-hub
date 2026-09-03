import { ArrowLeft, BarChart3, Mail, Megaphone, TrendingUp } from "lucide-react"
import type React from "react"
import { Button } from "@/components/ui/button"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"
import { Link, useLocation, useNavigate } from "@/router/compat"

export const MarketingSidebar: React.FC = () => {
  const location = useLocation()
  const navigate = useNavigate()

  const isActive = (path: string) => {
    return location.pathname === path || location.pathname.startsWith(`${path}/`)
  }

  const marketingItems = [
    {
      title: "Newsletter Builder",
      path: "/marketing/campaigns",
      icon: Mail,
    },
    {
      title: "Campaigns",
      path: "/marketing/campaigns#list",
      icon: Megaphone,
    },
    {
      title: "Analytics",
      path: "/marketing/campaigns#analytics",
      icon: BarChart3,
    },
    {
      title: "Performance",
      path: "/marketing/campaigns#performance",
      icon: TrendingUp,
    },
  ]

  return (
    <Sidebar>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Marketing</SidebarGroupLabel>
          <SidebarMenu>
            {marketingItems.map((item) => {
              const Icon = item.icon
              const itemPath = item.path.split("#")[0]
              const itemHash = item.path.includes("#") ? `#${item.path.split("#")[1]}` : ""
              const itemIsActive =
                location.pathname === itemPath &&
                (itemHash ? location.hash === itemHash : !location.hash)

              return (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild isActive={itemIsActive}>
                    <Link to={item.path}>
                      <Icon className="h-4 w-4" />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              )
            })}
          </SidebarMenu>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter>
        <Button
          variant="outline"
          size="sm"
          onClick={() => navigate("/interactions/text")}
          className="w-full"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Dashboard
        </Button>
      </SidebarFooter>
    </Sidebar>
  )
}
