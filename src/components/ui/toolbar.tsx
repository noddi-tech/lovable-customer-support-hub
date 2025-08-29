import * as React from "react"
import { cn } from "@/lib/utils"

export interface ToolbarProps extends React.HTMLAttributes<HTMLDivElement> {}

export function Toolbar({ className, ...props }: ToolbarProps) {
  return (
    <div
      {...props}
      className={cn(
        "flex flex-wrap items-center gap-2 w-full min-w-0 overflow-y-visible",
        className
      )}
    />
  )
}