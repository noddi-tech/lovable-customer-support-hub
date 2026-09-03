import type React from "react"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"

export type ChatFilterType = "active" | "waiting" | "ended" | "all"

interface ChatFiltersProps {
  currentFilter: ChatFilterType
  onFilterChange: (filter: ChatFilterType) => void
  counts?: {
    active: number
    waiting: number
    ended: number
    all: number
  }
}

const DEFAULT_COUNTS = { active: 0, waiting: 0, ended: 0, all: 0 }

export const ChatFilters: React.FC<ChatFiltersProps> = ({
  currentFilter,
  onFilterChange,
  counts = DEFAULT_COUNTS,
}) => {
  const filters: { key: ChatFilterType; label: string; count: number }[] = [
    { key: "active", label: "Active", count: counts.active },
    { key: "waiting", label: "Waiting", count: counts.waiting },
    { key: "ended", label: "Ended", count: counts.ended },
    { key: "all", label: "All", count: counts.all },
  ]

  return (
    <div className="flex items-center gap-1 px-2 py-2 border-b overflow-x-auto scrollbar-none min-h-[52px]">
      {filters.map((filter) => (
        <button
          type="button"
          key={filter.key}
          onClick={() => onFilterChange(filter.key)}
          className={cn(
            "flex h-9 shrink-0 items-center gap-1.5 px-3 text-sm font-medium leading-none rounded-md transition-colors",
            currentFilter === filter.key
              ? "bg-primary text-primary-foreground"
              : "text-muted-foreground hover:bg-muted hover:text-foreground",
          )}
        >
          {filter.label}
          <Badge
            variant={currentFilter === filter.key ? "secondary" : "outline"}
            className={cn(
              "flex items-center justify-center text-[10px] px-1.5 py-0 h-5 min-w-[20px] shrink-0",
              currentFilter === filter.key && "bg-primary-foreground/20 text-primary-foreground",
            )}
          >
            {filter.count}
          </Badge>
        </button>
      ))}
    </div>
  )
}
