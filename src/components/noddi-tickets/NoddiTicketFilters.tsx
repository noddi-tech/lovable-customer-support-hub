import { Search, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  NODDI_TICKET_CATEGORIES,
  NODDI_TICKET_PRIORITIES,
  type NoddiTicketCategory,
  type NoddiTicketPriority,
  TICKET_CATEGORY_LABELS,
  TICKET_PRIORITY_LABELS,
} from "@/types/noddiTicket"

export interface NoddiTicketFilterState {
  search: string
  priority: NoddiTicketPriority | "ALL"
  category: NoddiTicketCategory | "ALL"
  departmentId: number | null
}

interface Props {
  value: NoddiTicketFilterState
  onChange: (next: NoddiTicketFilterState) => void
  departments: Array<{ id: number; name: string }>
}

export function NoddiTicketFilters({ value, onChange, departments }: Props) {
  const hasFilters =
    !!value.search ||
    value.priority !== "ALL" ||
    value.category !== "ALL" ||
    value.departmentId !== null

  return (
    <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap sm:items-center">
      <div className="relative col-span-2 sm:min-w-[240px] sm:flex-1">
        <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={value.search}
          onChange={(e) => onChange({ ...value, search: e.target.value })}
          placeholder="Search tickets in Noddi…"
          className="h-10 pl-8 text-base sm:h-9 sm:text-sm"
        />
      </div>

      <Select
        value={value.priority}
        onValueChange={(v) =>
          onChange({ ...value, priority: v as NoddiTicketFilterState["priority"] })
        }
      >
        <SelectTrigger className="h-10 w-full sm:h-9 sm:w-[150px]">
          <SelectValue placeholder="Priority" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="ALL">All priorities</SelectItem>
          {NODDI_TICKET_PRIORITIES.map((p) => (
            <SelectItem key={p} value={p}>
              {TICKET_PRIORITY_LABELS[p]}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select
        value={value.category}
        onValueChange={(v) =>
          onChange({ ...value, category: v as NoddiTicketFilterState["category"] })
        }
      >
        <SelectTrigger className="h-10 w-full sm:h-9 sm:w-[180px]">
          <SelectValue placeholder="Category" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="ALL">All categories</SelectItem>
          {NODDI_TICKET_CATEGORIES.map((c) => (
            <SelectItem key={c} value={c}>
              {TICKET_CATEGORY_LABELS[c]}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select
        value={value.departmentId ? String(value.departmentId) : "ALL"}
        onValueChange={(v) => onChange({ ...value, departmentId: v === "ALL" ? null : Number(v) })}
      >
        <SelectTrigger className="col-span-2 h-10 w-full sm:h-9 sm:w-[200px]">
          <SelectValue placeholder="Department" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="ALL">All departments</SelectItem>
          {departments.map((d) => (
            <SelectItem key={d.id} value={String(d.id)}>
              {d.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {hasFilters && (
        <Button
          variant="ghost"
          size="sm"
          className="col-span-2 sm:col-auto"
          onClick={() =>
            onChange({ search: "", priority: "ALL", category: "ALL", departmentId: null })
          }
        >
          <X className="mr-1 h-4 w-4" /> Clear
        </Button>
      )}
    </div>
  )
}
