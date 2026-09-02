import * as React from "react"

import { SelectItem } from "@/components/ui/select"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"

interface DescribedSelectItemProps
  extends Omit<React.ComponentPropsWithoutRef<typeof SelectItem>, "title"> {
  /** Detailed explanation of what this value means and what it causes. */
  description?: React.ReactNode
  /** Optional bold title shown above the description. */
  title?: React.ReactNode
}

/**
 * A SelectItem that reveals a detailed description popup on mouse hover,
 * so users understand what each value means and what it triggers.
 */
export const DescribedSelectItem = React.forwardRef<
  React.ElementRef<typeof SelectItem>,
  DescribedSelectItemProps
>(({ description, title, children, ...props }, ref) => {
  if (!description) {
    return (
      <SelectItem ref={ref} {...props}>
        {children}
      </SelectItem>
    )
  }

  return (
    <Tooltip delayDuration={200}>
      <TooltipTrigger asChild>
        <SelectItem ref={ref} {...props}>
          {children}
        </SelectItem>
      </TooltipTrigger>
      <TooltipContent
        side="right"
        align="start"
        sideOffset={8}
        collisionPadding={12}
        className="max-w-[260px] text-xs leading-relaxed"
      >
        {title && <p className="font-medium mb-1">{title}</p>}
        <p className="text-muted-foreground">{description}</p>
      </TooltipContent>
    </Tooltip>
  )
})
DescribedSelectItem.displayName = "DescribedSelectItem"
