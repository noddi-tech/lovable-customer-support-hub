import * as React from "react"
import * as SelectPrimitive from "@radix-ui/react-select"
import { Check, ChevronDown, ChevronUp, Search } from "lucide-react"

import { cn } from "@/lib/utils"

const Select = SelectPrimitive.Root

const SelectGroup = SelectPrimitive.Group

const SelectValue = SelectPrimitive.Value

const SelectTrigger = React.forwardRef<
  React.ElementRef<typeof SelectPrimitive.Trigger>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.Trigger>
>(({ className, children, ...props }, ref) => (
  <SelectPrimitive.Trigger
    ref={ref}
    className={cn(
      "flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-0 disabled:cursor-not-allowed disabled:opacity-50 [&>span]:line-clamp-1",
      className
    )}
    {...props}
  >
    {children}
    <SelectPrimitive.Icon asChild>
      <ChevronDown className="h-4 w-4 opacity-50" />
    </SelectPrimitive.Icon>
  </SelectPrimitive.Trigger>
))
SelectTrigger.displayName = SelectPrimitive.Trigger.displayName

const SelectScrollUpButton = React.forwardRef<
  React.ElementRef<typeof SelectPrimitive.ScrollUpButton>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.ScrollUpButton>
>(({ className, ...props }, ref) => (
  <SelectPrimitive.ScrollUpButton
    ref={ref}
    className={cn(
      "flex cursor-default items-center justify-center py-1",
      className
    )}
    {...props}
  >
    <ChevronUp className="h-4 w-4" />
  </SelectPrimitive.ScrollUpButton>
))
SelectScrollUpButton.displayName = SelectPrimitive.ScrollUpButton.displayName

const SelectScrollDownButton = React.forwardRef<
  React.ElementRef<typeof SelectPrimitive.ScrollDownButton>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.ScrollDownButton>
>(({ className, ...props }, ref) => (
  <SelectPrimitive.ScrollDownButton
    ref={ref}
    className={cn(
      "flex cursor-default items-center justify-center py-1",
      className
    )}
    {...props}
  >
    <ChevronDown className="h-4 w-4" />
  </SelectPrimitive.ScrollDownButton>
))
SelectScrollDownButton.displayName =
  SelectPrimitive.ScrollDownButton.displayName

/**
 * Every dropdown in the app gets a search field for free: `SelectContent`
 * shows one automatically once it holds `SEARCH_THRESHOLD` or more options,
 * and filters its own children by their visible text. Pass
 * `searchable={false}` (or `searchable` to force it on) to override.
 */
const SEARCH_THRESHOLD = 8

const nodeText = (node: React.ReactNode): string => {
  if (node == null || typeof node === "boolean") return ""
  if (typeof node === "string" || typeof node === "number") return String(node)
  if (Array.isArray(node)) return node.map(nodeText).join(" ")
  if (React.isValidElement<{ children?: React.ReactNode }>(node)) return nodeText(node.props.children)
  return ""
}

const isSelectItem = (
  node: React.ReactNode
): node is React.ReactElement<{ children?: React.ReactNode }> =>
  React.isValidElement(node) &&
  (node.type === SelectItem || node.type === SelectPrimitive.Item)

const countItems = (children: React.ReactNode): number =>
  React.Children.toArray(children).reduce<number>((total, child) => {
    if (isSelectItem(child)) return total + 1
    if (React.isValidElement<{ children?: React.ReactNode }>(child))
      return total + countItems(child.props.children)
    return total
  }, 0)

/** Keeps items whose text matches, and drops groups left without any. */
const filterItems = (children: React.ReactNode, query: string): React.ReactNode =>
  React.Children.toArray(children).map((child) => {
    if (isSelectItem(child)) {
      return nodeText(child.props.children).toLowerCase().includes(query) ? child : null
    }
    if (
      React.isValidElement<{ children?: React.ReactNode }>(child) &&
      countItems(child.props.children) > 0
    ) {
      const kept = filterItems(child.props.children, query)
      const hasVisibleItem = React.Children.toArray(kept).some(Boolean)
      return hasVisibleItem ? React.cloneElement(child, child.props, kept) : null
    }
    return child
  })

interface SelectContentProps
  extends React.ComponentPropsWithoutRef<typeof SelectPrimitive.Content> {
  /** `undefined` = automatic (search appears for long lists). */
  searchable?: boolean
  searchPlaceholder?: string
}

/**
 * Lives inside `SelectPrimitive.Content` so it mounts fresh on every open:
 * the query resets and the field takes focus automatically.
 */
const SelectSearchableBody = ({
  children,
  position,
  showSearch,
  searchPlaceholder,
}: {
  children: React.ReactNode
  position: "item-aligned" | "popper"
  showSearch: boolean
  searchPlaceholder: string
}) => {
  const [query, setQuery] = React.useState("")
  const inputRef = React.useRef<HTMLInputElement>(null)
  const viewportRef = React.useRef<HTMLDivElement>(null)

  React.useEffect(() => {
    if (!showSearch) return
    const frame = requestAnimationFrame(() => inputRef.current?.focus())
    return () => cancelAnimationFrame(frame)
  }, [showSearch])

  const normalized = query.trim().toLowerCase()
  const visible = normalized ? filterItems(children, normalized) : children
  const isEmpty = !!normalized && !React.Children.toArray(visible).some(Boolean)

  return (
    <>
      {showSearch && (
        <div className="sticky top-0 z-10 border-b bg-popover p-1">
          <div className="relative">
            <Search className="pointer-events-none absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <input
              ref={inputRef}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={searchPlaceholder}
              aria-label={searchPlaceholder}
              className="h-8 w-full rounded-sm bg-transparent pl-7 pr-2 text-sm outline-none placeholder:text-muted-foreground"
              onKeyDown={(e) => {
                if (e.key === "ArrowDown") {
                  const first = viewportRef.current?.querySelector<HTMLElement>('[role="option"]')
                  if (first) {
                    e.preventDefault()
                    first.focus()
                  }
                  return
                }
                // Keep typing in the input instead of Radix's typeahead.
                if (e.key !== "Escape" && e.key !== "Tab") e.stopPropagation()
              }}
            />
          </div>
        </div>
      )}
      <SelectScrollUpButton />
      <SelectPrimitive.Viewport
        ref={viewportRef}
        className={cn(
          "p-1",
          position === "popper" &&
            "h-[var(--radix-select-trigger-height)] w-full min-w-[var(--radix-select-trigger-width)]"
        )}
      >
        {visible}
        {isEmpty && (
          <div className="py-6 text-center text-sm text-muted-foreground">No results found</div>
        )}
      </SelectPrimitive.Viewport>
      <SelectScrollDownButton />
    </>
  )
}

const SelectContent = React.forwardRef<
  React.ElementRef<typeof SelectPrimitive.Content>,
  SelectContentProps
>(
  (
    {
      className,
      children,
      position = "popper",
      searchable,
      searchPlaceholder = "Search…",
      ...props
    },
    ref
  ) => (
    <SelectPrimitive.Portal>
      <SelectPrimitive.Content
        ref={ref}
        className={cn(
          "relative z-[200] max-h-96 min-w-[8rem] overflow-hidden rounded-md border bg-popover text-popover-foreground shadow-md data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2",
          position === "popper" &&
            "data-[side=bottom]:translate-y-1 data-[side=left]:-translate-x-1 data-[side=right]:translate-x-1 data-[side=top]:-translate-y-1",
          className
        )}
        position={position}
        {...props}
      >
        <SelectSearchableBody
          position={position}
          showSearch={searchable ?? countItems(children) >= SEARCH_THRESHOLD}
          searchPlaceholder={searchPlaceholder}
        >
          {children}
        </SelectSearchableBody>
      </SelectPrimitive.Content>
    </SelectPrimitive.Portal>
  )
)
SelectContent.displayName = SelectPrimitive.Content.displayName

const SelectLabel = React.forwardRef<
  React.ElementRef<typeof SelectPrimitive.Label>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.Label>
>(({ className, ...props }, ref) => (
  <SelectPrimitive.Label
    ref={ref}
    className={cn("py-1.5 pl-8 pr-2 text-sm font-semibold", className)}
    {...props}
  />
))
SelectLabel.displayName = SelectPrimitive.Label.displayName

const SelectItem = React.forwardRef<
  React.ElementRef<typeof SelectPrimitive.Item>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.Item>
>(({ className, children, ...props }, ref) => (
  <SelectPrimitive.Item
    ref={ref}
    className={cn(
      "relative flex w-full cursor-default select-none items-center rounded-sm py-1.5 pl-8 pr-2 text-sm outline-none focus:bg-accent focus:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50",
      className
    )}
    {...props}
  >
    <span className="absolute left-2 flex h-3.5 w-3.5 items-center justify-center">
      <SelectPrimitive.ItemIndicator>
        <Check className="h-4 w-4" />
      </SelectPrimitive.ItemIndicator>
    </span>

    <SelectPrimitive.ItemText>{children}</SelectPrimitive.ItemText>
  </SelectPrimitive.Item>
))
SelectItem.displayName = SelectPrimitive.Item.displayName

const SelectSeparator = React.forwardRef<
  React.ElementRef<typeof SelectPrimitive.Separator>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.Separator>
>(({ className, ...props }, ref) => (
  <SelectPrimitive.Separator
    ref={ref}
    className={cn("-mx-1 my-1 h-px bg-muted", className)}
    {...props}
  />
))
SelectSeparator.displayName = SelectPrimitive.Separator.displayName

export {
  Select,
  SelectGroup,
  SelectValue,
  SelectTrigger,
  SelectContent,
  SelectLabel,
  SelectItem,
  SelectSeparator,
  SelectScrollUpButton,
  SelectScrollDownButton,
}
