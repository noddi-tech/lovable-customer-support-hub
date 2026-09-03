import { ArrowLeft, BarChart3, Send, Users } from "lucide-react"
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

export const OperationsSidebar: React.FC = () => {
  const location = useLocation()
  const navigate = useNavigate()

  const isActive = (path: string) => {
    return location.pathname === path || location.pathname.startsWith(`${path}/`)
  }

  const operationsItems = [
    {
      title: "Recruitment",
      path: "/operations/recruitment",
      icon: Users,
    },
    {
      title: "Analytics",
      path: "/operations/analytics",
      icon: BarChart3,
    },
    {
      title: "Bulk Outreach",
      path: "/operations/bulk-outreach",
      icon: Send,
    },
  ]

  return (
    <Sidebar>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Operations</SidebarGroupLabel>
          <SidebarMenu>
            {operationsItems.map((item) => {
              const Icon = item.icon
              return (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild isActive={isActive(item.path)}>
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
