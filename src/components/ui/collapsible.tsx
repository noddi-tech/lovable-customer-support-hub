import * as React from "react"
import * as CollapsiblePrimitive from "@radix-ui/react-collapsible"
import { cn } from "@/lib/utils"

const Collapsible = CollapsiblePrimitive.Root

const CollapsibleTrigger = CollapsiblePrimitive.CollapsibleTrigger

const CollapsibleContent = React.forwardRef<
  React.ElementRef<typeof CollapsiblePrimitive.CollapsibleContent>,
  React.ComponentPropsWithoutRef<typeof CollapsiblePrimitive.CollapsibleContent>
>(({ className, children, ...props }, ref) => (
  <CollapsiblePrimitive.CollapsibleContent
    ref={ref}
    className={cn(
      "overflow-hidden",
      "[.disable-animation_&]:!transition-none",
      "[.disable-animation_&]:!duration-[0ms]",
      "[.disable-animation_&]:!animate-none",
      "[.disable-animation_&]:!h-auto",
      "[.disable-animation_&[data-state=closed]]:!hidden",
      "[.disable-animation_&[data-state=open]]:!opacity-100",
      "[.disable-animation_&[data-state=closed]]:!opacity-0",
      className
    )}
    {...props}
  >
    {children}
  </CollapsiblePrimitive.CollapsibleContent>
))
CollapsibleContent.displayName = "CollapsibleContent"

export { Collapsible, CollapsibleTrigger, CollapsibleContent }
