import * as React from "react"
import { cn } from "@/lib/utils"
import { useIsMobile } from "@/hooks/use-mobile"

interface ResponsiveLayoutProps {
  children: React.ReactNode
  header?: React.ReactNode
  className?: string
  sidebar?: React.ReactNode
  bottomTabs?: React.ReactNode
  leftDrawer?: React.ReactNode
  rightDrawer?: React.ReactNode
}

const ResponsiveLayout = React.forwardRef<HTMLDivElement, ResponsiveLayoutProps>(
  ({ className, children, header, sidebar, bottomTabs, leftDrawer, rightDrawer, ...props }, ref) => {
    const isMobile = useIsMobile()
    
    return (
      <div
        ref={ref}
        className={cn("app-root", className)}
        {...props}
      >
        {/* Header */}
        {header && (
          <div className="app-header">
            {header}
          </div>
        )}
        
        {/* Main Content Area */}
        <div className="app-main">
          {/* Desktop/Tablet Sidebar */}
          {sidebar && !isMobile && (
            <div className="nav-pane">
              {sidebar}
            </div>
          )}
          
          {/* Main Content - children will be direct grid items */}
          {children}
        </div>

        {/* Mobile Drawers */}
        {leftDrawer}
        {rightDrawer}
        
        {/* iPhone Bottom Tabs */}
        {bottomTabs && isMobile && (
          <div className="bottom-tabs">
            {bottomTabs}
          </div>
        )}
      </div>
    )
  }
)

ResponsiveLayout.displayName = "ResponsiveLayout"

export { ResponsiveLayout }