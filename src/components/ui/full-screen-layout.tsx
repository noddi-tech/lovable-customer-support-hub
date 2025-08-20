import * as React from "react"
import { cn } from "@/lib/utils"

interface FullScreenLayoutProps {
  children: React.ReactNode
  header?: React.ReactNode
  className?: string
  lockScroll?: boolean
}

const FullScreenLayout = React.forwardRef<
  HTMLDivElement,
  FullScreenLayoutProps
>(({ className, children, header, lockScroll = false, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      "h-screen flex flex-col",
      lockScroll ? "overflow-hidden" : "overflow-y-auto",
      className
    )}
    {...props}
  >
    {header && (
      <div className="flex-shrink-0">
        {header}
      </div>
    )}
    <div className={cn(
      "flex-1 min-h-0",
      lockScroll ? "overflow-hidden" : "overflow-y-auto"
    )}>
      {children}
    </div>
  </div>
))

FullScreenLayout.displayName = "FullScreenLayout"

export { FullScreenLayout }