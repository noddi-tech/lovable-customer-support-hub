import * as React from "react"
import { cn } from "@/lib/utils"
import { useIsMobile } from "@/hooks/use-responsive"
import { Sidebar, SidebarInset, SidebarProvider } from "@/components/ui/sidebar"

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

    // If sidebar is provided, use Shadcn Sidebar layout
    if (sidebar) {
      return (
        <SidebarProvider>
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
            
            {/* Main Content Area with Sidebar */}
            <div className={cn("app-main flex min-h-0", ...mainClasses, isMobile && bottomTabs && "pb-16")}>
              {/* Sidebar */}
              <Sidebar className="border-r">
                {sidebar}
              </Sidebar>
              
              {/* Main Content */}
              <SidebarInset className="flex-1 min-h-0">
                {children}
              </SidebarInset>
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
        </SidebarProvider>
      )
    }
    
    // Standard layout without sidebar
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