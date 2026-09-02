import type { LucideIcon } from "lucide-react"
import { Loader2 } from "lucide-react"
import type { ReactNode } from "react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { cn } from "@/lib/utils"

export const METRICS_RANGES = [7, 30, 90] as const
export type MetricsRange = (typeof METRICS_RANGES)[number]

export interface MetricsDialogShellProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** Channel icon shown next to the title. */
  icon: LucideIcon
  title: string
  description: string
  /** Selected range in days — omit the pair to hide the range switcher. */
  days?: number
  onDaysChange?: (days: number) => void
  isLoading?: boolean
  loadingLabel?: string
  error?: Error | null
  /** Extra controls rendered on the right of the range switcher. */
  toolbarExtra?: ReactNode
  footer?: ReactNode
  className?: string
  children: ReactNode
}

/**
 * One dialog frame for every channel's metrics popup (inbox, live chat, voice)
 * so the analytics experience looks and behaves the same everywhere.
 */
export function MetricsDialogShell({
  open,
  onOpenChange,
  icon: Icon,
  title,
  description,
  days,
  onDaysChange,
  isLoading,
  loadingLabel = "Calculating metrics…",
  error,
  toolbarExtra,
  footer,
  className,
  children,
}: MetricsDialogShellProps) {
  const showRanges = typeof days === "number" && !!onDaysChange

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={cn("sm:max-w-2xl max-h-[85vh] overflow-y-auto", className)}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Icon className="h-4 w-4" /> {title}
          </DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        {(showRanges || toolbarExtra) && (
          <div className="flex flex-wrap items-center gap-1">
            {showRanges &&
              METRICS_RANGES.map((r) => (
                <Button
                  key={r}
                  size="sm"
                  variant={days === r ? "secondary" : "ghost"}
                  className="h-7 px-2 text-xs"
                  onClick={() => onDaysChange?.(r)}
                >
                  Last {r} days
                </Button>
              ))}
            {toolbarExtra && <div className="ml-auto flex items-center gap-1">{toolbarExtra}</div>}
          </div>
        )}

        {isLoading && (
          <div className="flex items-center justify-center gap-2 py-10 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> {loadingLabel}
          </div>
        )}

        {error && !isLoading && (
          <p className="py-6 text-sm text-destructive">Could not load metrics: {error.message}</p>
        )}

        {!isLoading && !error && children}

        {footer && !isLoading && <div className="text-[11px] text-muted-foreground">{footer}</div>}
      </DialogContent>
    </Dialog>
  )
}

export default MetricsDialogShell
