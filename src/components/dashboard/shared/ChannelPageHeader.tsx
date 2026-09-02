import type { LucideIcon } from "lucide-react"
import { BarChart3 } from "lucide-react"
import type { ReactNode } from "react"
import { Button } from "@/components/ui/button"
import { SidebarTrigger } from "@/components/ui/sidebar"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { cn } from "@/lib/utils"

export interface ChannelPageHeaderProps {
  icon: LucideIcon
  title: string
  /** Right-hand actions, rendered after the metrics button. */
  actions?: ReactNode
  /** Opens this channel's metrics popup. Omit to hide the button. */
  onOpenMetrics?: () => void
  metricsLabel?: string
  className?: string
}

/**
 * The single top bar used by inbox, live chat and voice so every channel page
 * has the same structure: mobile sidebar trigger, icon + title, then actions
 * with the metrics button always first on the right.
 */
export function ChannelPageHeader({
  icon: Icon,
  title,
  actions,
  onOpenMetrics,
  metricsLabel = "Metrics",
  className,
}: ChannelPageHeaderProps) {
  return (
    <div
      className={cn(
        "flex items-center gap-2 px-3 py-2.5 border-b bg-card sm:px-4 sm:py-3",
        className,
      )}
    >
      <SidebarTrigger className="shrink-0 h-8 w-8 md:hidden" />
      <Icon className="h-4 w-4 text-primary shrink-0 sm:h-5 sm:w-5" />
      <h1 className="truncate text-base font-semibold sm:text-lg">{title}</h1>

      <div className="ml-auto flex items-center gap-1">
        {onOpenMetrics && <MetricsButton label={metricsLabel} onClick={onOpenMetrics} />}
        {actions}
      </div>
    </div>
  )
}

/** Standard "view metrics/analytics" trigger, identical on every channel page. */
export function MetricsButton({
  label = "Metrics",
  onClick,
}: {
  label?: string
  onClick: () => void
}) {
  return (
    <TooltipProvider delayDuration={200}>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            className="h-8 gap-1.5 px-2 text-xs"
            onClick={onClick}
            aria-label={`${label} — analytics for this view`}
          >
            <BarChart3 className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">{label}</span>
          </Button>
        </TooltipTrigger>
        <TooltipContent>Analytics &amp; KPIs for this view</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}

export default ChannelPageHeader
