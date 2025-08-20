import * as React from "react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"

interface BottomTabItem {
  id: string
  label: string
  icon: React.ComponentType<{ className?: string }>
  badge?: number | string
  disabled?: boolean
}

interface BottomTabsProps {
  items: BottomTabItem[]
  activeTab: string
  onTabChange: (tabId: string) => void
  className?: string
}

const BottomTabs = React.forwardRef<HTMLDivElement, BottomTabsProps>(
  ({ items, activeTab, onTabChange, className, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn("bottom-tabs", className)}
        role="tablist"
        {...props}
      >
        {items.map((item) => {
          const Icon = item.icon
          const isActive = activeTab === item.id
          
          return (
            <Button
              key={item.id}
              variant={isActive ? "default" : "ghost"}
              size="sm"
              className={cn(
                "flex-1 flex flex-col items-center justify-center gap-1 h-auto py-2 px-1",
                "text-xs font-medium transition-colors",
                isActive 
                  ? "text-primary-foreground bg-primary" 
                  : "text-muted-foreground hover:text-foreground"
              )}
              onClick={() => !item.disabled && onTabChange(item.id)}
              disabled={item.disabled}
              role="tab"
              aria-selected={isActive}
              aria-controls={`panel-${item.id}`}
            >
              <div className="relative">
                <Icon className="h-5 w-5" />
                {item.badge && (
                  <Badge 
                    variant="destructive" 
                    className="absolute -top-2 -right-2 h-4 min-w-4 p-0 text-xs flex items-center justify-center"
                  >
                    {item.badge}
                  </Badge>
                )}
              </div>
              <span className="truncate max-w-16">{item.label}</span>
            </Button>
          )
        })}
      </div>
    )
  }
)

BottomTabs.displayName = "BottomTabs"

export { BottomTabs, type BottomTabItem }