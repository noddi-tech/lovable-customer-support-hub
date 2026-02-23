import * as React from "react"
import { cn } from "@/lib/utils"

const ButtonGroup = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    role="group"
    className={cn(
      "inline-flex items-center",
      "[&>*]:rounded-none",
      "[&>*:first-child]:rounded-l-[var(--button-border-radius,0.5rem)]",
      "[&>*:last-child]:rounded-r-[var(--button-border-radius,0.5rem)]",
      "[&>*:not(:first-child)]:-ml-px",
      className
    )}
    {...props}
  />
))
ButtonGroup.displayName = "ButtonGroup"

const ButtonGroupSeparator = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & { orientation?: "horizontal" | "vertical" }
>(({ className, orientation = "vertical", ...props }, ref) => (
  <div
    ref={ref}
    role="separator"
    className={cn(
      "bg-border",
      orientation === "vertical" ? "h-full w-px" : "h-px w-full",
      className
    )}
    {...props}
  />
))
ButtonGroupSeparator.displayName = "ButtonGroupSeparator"

export { ButtonGroup, ButtonGroupSeparator }
