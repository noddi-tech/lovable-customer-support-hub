import { ChevronDown, Tag } from "lucide-react"
import type React from "react"
import { BrandMenuOptions } from "@/components/brands/BrandMenuOptions"
import { BrandBadge } from "@/components/dashboard/conversation-list/BrandBadge"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { getConversationBrand } from "@/lib/conversationBrand"

interface BrandPickerButtonProps {
  /** Entity metadata holding the brand (conversation or call). */
  metadata: unknown
  channel?: string | null
  onSelect: (brandName: string | null) => void
  title?: string
  className?: string
  /** Keep clicks from selecting the underlying row. */
  stopPropagation?: boolean
}

/**
 * Dropdown control showing the current brand badge and letting agents pick a
 * brand from the Noddi catalog. Shared by conversation and call detail views.
 */
export const BrandPickerButton: React.FC<BrandPickerButtonProps> = ({
  metadata,
  channel,
  onSelect,
  title,
  className,
  stopPropagation = false,
}) => {
  const brand = getConversationBrand(metadata, channel)
  const stop = stopPropagation ? (e: React.MouseEvent) => e.stopPropagation() : undefined

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className={`h-7 px-1.5 gap-1 text-xs ${className ?? ""}`}
          title={title}
          onClick={stop}
        >
          {brand ? (
            <BrandBadge brand={brand} size="md" />
          ) : (
            <span className="inline-flex items-center gap-1 text-muted-foreground">
              <Tag className="h-3.5 w-3.5" />
              Set brand
            </span>
          )}
          <ChevronDown className="h-3 w-3 text-muted-foreground" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="start"
        className="w-60 max-h-80 overflow-y-auto p-1"
        onClick={stop}
      >
        <DropdownMenuLabel className="text-xs text-muted-foreground">Brand</DropdownMenuLabel>
        <BrandMenuOptions
          currentLabel={brand?.label}
          onSelect={onSelect}
          Item={DropdownMenuItem}
          Separator={DropdownMenuSeparator}
        />
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
