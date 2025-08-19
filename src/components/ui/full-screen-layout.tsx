import * as React from "react"
import { cn } from "@/lib/utils"

interface FullScreenLayoutProps {
  children: React.ReactNode
  header?: React.ReactNode
  className?: string
}

const FullScreenLayout = React.forwardRef<
  HTMLDivElement,
  FullScreenLayoutProps
>(({ className, children, header, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("h-screen flex flex-col overflow-hidden", className)}
    {...props}
  >
    {header && (
      <div className="flex-shrink-0">
        {header}
      </div>
    )}
    <div className="flex-1 overflow-hidden min-h-0">
      {children}
    </div>
  </div>
))

FullScreenLayout.displayName = "FullScreenLayout"

export { FullScreenLayout }