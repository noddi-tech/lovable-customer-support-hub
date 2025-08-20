import * as React from "react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"

interface TabItem {
  id: string
  label: string
  icon: React.ReactNode
  onClick: () => void
}

interface BottomTabsProps {
  items: TabItem[]
  activeTab?: string
  className?: string
}

const BottomTabs = React.forwardRef<HTMLDivElement, BottomTabsProps>(
  ({ items, activeTab, className, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn("bottom-tabs", className)}
        {...props}
      >
        {items.map((item) => (
          <Button
            key={item.id}
            variant={activeTab === item.id ? "default" : "ghost"}
            size="sm"
            onClick={item.onClick}
            className={cn(
              "flex flex-col items-center justify-center min-h-[44px] gap-1 text-xs font-medium",
              activeTab === item.id && "bg-primary text-primary-foreground"
            )}
          >
            <div className="h-5 w-5 flex items-center justify-center">
              {item.icon}
            </div>
            <span className="text-[10px] leading-tight">{item.label}</span>
          </Button>
        ))}
      </div>
    )
  }
)

BottomTabs.displayName = "BottomTabs"

export { BottomTabs, type TabItem }