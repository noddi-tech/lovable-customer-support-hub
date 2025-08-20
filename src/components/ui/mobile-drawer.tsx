import * as React from "react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { X } from "lucide-react"

interface MobileDrawerProps {
  children: React.ReactNode
  isOpen: boolean
  onClose: () => void
  side: "left" | "right"
  title?: string
  className?: string
}

const MobileDrawer = React.forwardRef<HTMLDivElement, MobileDrawerProps>(
  ({ children, isOpen, onClose, side, title, className, ...props }, ref) => {
    // Handle escape key
    React.useEffect(() => {
      const handleEscape = (event: KeyboardEvent) => {
        if (event.key === 'Escape' && isOpen) {
          onClose()
        }
      }

      if (isOpen) {
        document.addEventListener('keydown', handleEscape)
        // Prevent body scrolling
        document.body.style.overflow = 'hidden'
      }

      return () => {
        document.removeEventListener('keydown', handleEscape)
        document.body.style.overflow = ''
      }
    }, [isOpen, onClose])

    // Focus trap
    const drawerRef = React.useRef<HTMLDivElement>(null)
    React.useEffect(() => {
      if (isOpen && drawerRef.current) {
        const firstFocusable = drawerRef.current.querySelector(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        ) as HTMLElement
        firstFocusable?.focus()
      }
    }, [isOpen])

    if (!isOpen) return null

    return (
      <>
        {/* Overlay */}
        <div 
          className="drawer-overlay"
          aria-hidden={!isOpen}
          onClick={onClose}
        />
        
        {/* Drawer */}
        <div
          ref={drawerRef}
          className={cn(
            "drawer",
            side === "left" ? "drawer--left" : "drawer--right",
            className
          )}
          aria-hidden={!isOpen}
          role="dialog"
          aria-modal="true"
          {...props}
        >
          {/* Header with close button */}
          {title && (
            <div className="flex items-center justify-between p-4 border-b border-border">
              <h2 className="text-lg font-semibold">{title}</h2>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={onClose}
                className="h-8 w-8 p-0"
                aria-label="Close drawer"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          )}
          
          {/* Content */}
          <div className="flex-1 overflow-y-auto">
            {children}
          </div>
        </div>
      </>
    )
  }
)

MobileDrawer.displayName = "MobileDrawer"

export { MobileDrawer }