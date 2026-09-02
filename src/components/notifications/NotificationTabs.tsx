import { AtSign, Bell, Phone, UserCheck } from "lucide-react"
import type React from "react"
import { useNavigate } from "react-router-dom"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import type { NotificationCategory } from "@/hooks/useNotificationFilters"
import { cn } from "@/lib/utils"

interface NotificationTabsProps {
  selectedCategory: NotificationCategory
  onSelectCategory: (category: NotificationCategory) => void
  unreadCounts: Record<NotificationCategory, number>
}

const tabConfig: Array<{
  id: NotificationCategory
  label: string
  icon: React.ElementType
}> = [
  { id: "unread", label: "Unread", icon: Bell },
  { id: "mentions", label: "Mentions", icon: AtSign },
  { id: "assigned", label: "Assigned", icon: UserCheck },
  { id: "calls", label: "Calls", icon: Phone },
]

export const NotificationTabs: React.FC<NotificationTabsProps> = ({
  selectedCategory,
  onSelectCategory,
  unreadCounts,
}) => {
  const navigate = useNavigate()

  const handleTabChange = (value: string) => {
    const category = value as NotificationCategory
    // Navigate via URL for proper browser history
    navigate(`/notifications/${category}`, { replace: false })
    // Also call the callback for any side effects
    onSelectCategory(category)
  }

  return (
    <Tabs value={selectedCategory} onValueChange={handleTabChange} className="w-full">
      <TabsList className="flex h-auto min-w-0 flex-wrap justify-start gap-1 bg-muted/50 p-1">
        {tabConfig.map(({ id, label, icon: Icon }) => {
          const count = unreadCounts[id]
          return (
            <TabsTrigger
              key={id}
              value={id}
              className={cn(
                "flex items-center gap-2 px-3 py-2 sm:px-4 data-[state=active]:bg-background",
                "data-[state=active]:shadow-sm",
              )}
            >
              <Icon className="h-4 w-4" />
              <span className="hidden sm:inline">{label}</span>
              {count > 0 && (
                <Badge
                  variant={id === "calls" ? "destructive" : "secondary"}
                  className="h-5 min-w-5 px-1.5 text-xs"
                >
                  {count > 99 ? "99+" : count}
                </Badge>
              )}
            </TabsTrigger>
          )
        })}
      </TabsList>
    </Tabs>
  )
}
