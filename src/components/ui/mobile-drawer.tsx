import * as React from "react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { X } from "lucide-react"

interface MobileDrawerProps {
  isOpen: boolean
  onClose: () => void
  side?: "left" | "right"
  children: React.ReactNode
  className?: string
  title?: string
}

const MobileDrawer = React.forwardRef<HTMLDivElement, MobileDrawerProps>(
  ({ isOpen, onClose, side = "left", children, className, title, ...props }, ref) => {
    const [mounted, setMounted] = React.useState(false)

    React.useEffect(() => {
      setMounted(true)
    }, [])

    React.useEffect(() => {
      if (isOpen) {
        document.body.style.overflow = "hidden"
        
        const handleKeyDown = (e: KeyboardEvent) => {
          if (e.key === "Escape") {
            onClose()
          }
        }
        
        document.addEventListener("keydown", handleKeyDown)
        return () => {
          document.removeEventListener("keydown", handleKeyDown)
        }
      } else {
        document.body.style.overflow = ""
      }
      
      return () => {
        document.body.style.overflow = ""
      }
    }, [isOpen, onClose])

    if (!mounted) return null

    return (
      <>
        {/* Backdrop */}
        {isOpen && (
          <div 
            className="fixed inset-0 bg-black/50 z-40 transition-opacity"
            onClick={onClose}
          />
        )}
        
        {/* Drawer */}
        <div
          ref={ref}
          className={cn(
            "drawer",
            `drawer--${side}`,
            className
          )}
          aria-hidden={!isOpen}
          {...props}
        >
          {/* Header */}
          {title && (
            <div className="flex items-center justify-between p-4 border-b border-border">
              <h2 className="font-semibold text-lg">{title}</h2>
              <Button
                variant="ghost"
                size="sm"
                onClick={onClose}
                className="h-8 w-8 p-0"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          )}
          
          {/* Content */}
          <div className="flex-1 overflow-auto">
            {children}
          </div>
        </div>
      </>
    )
  }
)

MobileDrawer.displayName = "MobileDrawer"

export { MobileDrawer }