import { ArrowDown, ArrowUp, ArrowUpDown } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { cn } from "@/lib/utils"

interface FlexHeaderCellProps {
  label: string
  sortKey: string
  currentSort: { key: string; direction: "asc" | "desc" | null }
  onSort: (key: string) => void
  className?: string
  /** Hover explanation of what the column shows. */
  description?: string
}

/**
 * Sortable header cell for the virtualized conversation list. Uses a div (not
 * a <th>) so the header can be a flex row whose widths match the virtualized
 * flex rows exactly.
 */
export const FlexHeaderCell = ({
  label,
  sortKey,
  currentSort,
  onSort,
  className,
  description,
}: FlexHeaderCellProps) => {
  const isActive = currentSort.key === sortKey
  const direction = isActive ? currentSort.direction : null

  const sortIcon =
    !isActive || direction === null ? (
      <ArrowUpDown className="h-3 w-3 opacity-50 shrink-0" />
    ) : direction === "asc" ? (
      <ArrowUp className="h-3 w-3 shrink-0" />
    ) : (
      <ArrowDown className="h-3 w-3 shrink-0" />
    )

  const button = (
    <Button
      variant="ghost"
      size="sm"
      className={cn(
        "h-6 px-0 w-full justify-start gap-1 font-medium text-xs hover:bg-transparent",
        isActive && "text-primary",
      )}
      onClick={() => onSort(sortKey)}
    >
      <span className="truncate">{label}</span>
      {sortIcon}
    </Button>
  )

  return (
    <div className={cn("p-2", className)}>
      {description ? (
        <Tooltip delayDuration={300}>
          <TooltipTrigger asChild>{button}</TooltipTrigger>
          <TooltipContent side="bottom" className="max-w-[260px] text-xs leading-relaxed">
            <p className="font-medium">{label || "Channel"}</p>
            <p className="opacity-80">{description}</p>
          </TooltipContent>
        </Tooltip>
      ) : (
        button
      )}
    </div>
  )
}
