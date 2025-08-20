import * as React from "react"
import { cn } from "@/lib/utils"
import { useIsMobile } from "@/hooks/use-responsive"

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
    
    // Extract grid state classes from className and apply them to app-main
    const rootClasses: string[] = []
    const mainClasses: string[] = []
    
    if (className) {
      const classes = className.split(' ')
      classes.forEach(cls => {
        if (cls.includes('list-') || cls.includes('sidebar-')) {
          mainClasses.push(cls)
        } else {
          rootClasses.push(cls)
        }
      })
    }
    
    return (
      <div
        ref={ref}
        className={cn("app-root", ...rootClasses)}
        {...props}
      >
        {/* Header */}
        {header && (
          <div className="app-header">
            {header}
          </div>
        )}
        
        {/* Main Content Area - Apply grid state classes here */}
        <div className={cn("app-main", ...mainClasses, isMobile && bottomTabs && "pb-16")}>
          {/* Main Content - children will be direct grid items (no nav-pane, handled by Shadcn Sidebar) */}
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