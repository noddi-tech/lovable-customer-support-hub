import { GripVertical } from "lucide-react"
import {
  Group,
  type GroupProps,
  Panel,
  type PanelProps,
  Separator,
  type SeparatorProps,
} from "react-resizable-panels"

import { cn } from "@/lib/utils"

type ResizablePanelGroupProps = GroupProps & {
  /** @deprecated Use `orientation` instead */
  direction?: GroupProps["orientation"]
  /** @deprecated Removed in react-resizable-panels v4 — accepted and ignored */
  autoSaveId?: string
}

const ResizablePanelGroup = ({
  className,
  direction,
  orientation,
  autoSaveId: _autoSaveId,
  ...props
}: ResizablePanelGroupProps) => (
  <Group
    className={cn("flex h-full w-full aria-[orientation=vertical]:flex-col", className)}
    orientation={orientation ?? direction}
    {...props}
  />
)

/**
 * react-resizable-panels v4 interprets bare numbers as PIXELS, while the app
 * (written against v2) passes percentages. Convert numbers to percentage
 * strings so `defaultSize={35}` still means 35%.
 */
const asPercent = (value: number | string | undefined) =>
  typeof value === "number" ? String(value) : value

const ResizablePanel = ({ defaultSize, minSize, maxSize, ...props }: PanelProps) => (
  <Panel
    defaultSize={asPercent(defaultSize)}
    minSize={asPercent(minSize)}
    maxSize={asPercent(maxSize)}
    {...props}
  />
)

const ResizableHandle = ({
  withHandle,
  className,
  ...props
}: SeparatorProps & {
  withHandle?: boolean
}) => (
  <Separator
    className={cn(
      "relative flex w-px cursor-col-resize items-center justify-center bg-border aria-[orientation=horizontal]:cursor-row-resize after:absolute after:inset-y-0 after:left-1/2 after:w-3 after:-translate-x-1/2 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring focus-visible:ring-offset-1 aria-[orientation=horizontal]:h-px aria-[orientation=horizontal]:w-full aria-[orientation=horizontal]:after:left-0 aria-[orientation=horizontal]:after:h-1 aria-[orientation=horizontal]:after:w-full aria-[orientation=horizontal]:after:-translate-y-1/2 aria-[orientation=horizontal]:after:translate-x-0 [&[aria-orientation=horizontal]>div]:rotate-90",
      className,
    )}
    {...props}
  >
    {withHandle && (
      <div className="z-10 flex h-4 w-3 items-center justify-center rounded-sm border bg-border">
        <GripVertical className="h-2.5 w-2.5" />
      </div>
    )}
  </Separator>
)

export { ResizableHandle, ResizablePanel, ResizablePanelGroup }
