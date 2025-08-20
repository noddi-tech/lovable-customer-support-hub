import * as React from "react"
import { cn } from "@/lib/utils"
import { useIsMobile } from "@/hooks/use-mobile"

interface ResponsiveLayoutProps {
  children: React.ReactNode
  className?: string
}

const ResponsiveLayout = React.forwardRef<HTMLDivElement, ResponsiveLayoutProps>(
  ({ children, className, ...props }, ref) => {
    const isMobile = useIsMobile()
    
    return (
      <div
        ref={ref}
        className={cn(
          "app-main responsive-layout bg-gradient-surface",
          className
        )}
        {...props}
      >
        {children}
      </div>
    )
  }
)

ResponsiveLayout.displayName = "ResponsiveLayout"

interface PaneProps {
  children: React.ReactNode
  className?: string
  type?: "nav" | "list" | "detail"
  collapsed?: boolean
}

const Pane = React.forwardRef<HTMLDivElement, PaneProps>(
  ({ children, className, type = "detail", collapsed = false, ...props }, ref) => {
    const baseClasses = {
      nav: "nav-pane",
      list: collapsed ? "list-pane-collapsed" : "list-pane", 
      detail: "detail-pane"
    }
    
    return (
      <div
        ref={ref}
        className={cn(baseClasses[type], className)}
        {...props}
      >
        {children}
      </div>
    )
  }
)

Pane.displayName = "Pane"

export { ResponsiveLayout, Pane }