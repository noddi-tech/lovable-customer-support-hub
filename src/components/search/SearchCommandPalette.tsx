import {
  ArrowRight,
  ExternalLink,
  LayoutGrid,
  Loader2,
  Mail,
  MessageSquare,
  Shield,
  User,
} from "lucide-react"
import type React from "react"
import { useCallback, useMemo, useState } from "react"
import { useTranslation } from "react-i18next"
import { useNavigate } from "react-router-dom"
import { PaletteAvailabilityActions } from "@/components/search/PaletteAvailabilityActions"
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command"
import { useAuth } from "@/hooks/useAuth"
import { useDebounce } from "@/hooks/useDebounce"
import { useGlobalSearch } from "@/hooks/useGlobalSearch"
import { filterNavPages, getNavPages, type NavPage, type NavScope } from "@/lib/navigation-registry"
import { cn } from "@/lib/utils"
import { stripHtml } from "@/utils/stripHtml"

interface SearchCommandPaletteProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export const SearchCommandPalette: React.FC<SearchCommandPaletteProps> = ({
  open,
  onOpenChange,
}) => {
  const [query, setQuery] = useState("")
  const [scope, setScope] = useState<NavScope>("app")
  const debouncedQuery = useDebounce(query, 300)
  const navigate = useNavigate()
  const { t } = useTranslation()
  const { isAdmin, isSuperAdmin } = useAuth()

  const canUseAdmin = !!isAdmin || !!isSuperAdmin
  const activeScope: NavScope = canUseAdmin ? scope : "app"

  const pages = useMemo(
    () => getNavPages(activeScope, { isAdmin, isSuperAdmin }),
    [activeScope, isAdmin, isSuperAdmin],
  )

  const pageResults = useMemo(() => filterNavPages(pages, query).slice(0, 12), [pages, query])

  const groupedPages = useMemo(() => {
    const groups = new Map<string, NavPage[]>()
    for (const page of pageResults) {
      const list = groups.get(page.group) ?? []
      list.push(page)
      groups.set(page.group, list)
    }
    return Array.from(groups.entries())
  }, [pageResults])

  const searchEnabled = open && activeScope === "app"

  const conversations = useGlobalSearch({
    query: debouncedQuery,
    type: "conversations",
    enabled: searchEnabled,
  })

  const customers = useGlobalSearch({
    query: debouncedQuery,
    type: "customers",
    enabled: searchEnabled,
  })

  const messages = useGlobalSearch({
    query: debouncedQuery,
    type: "messages",
    enabled: searchEnabled,
  })

  const isLoading =
    searchEnabled && (conversations.isLoading || customers.isLoading || messages.isLoading)

  const convResults = searchEnabled
    ? (conversations.data?.pages?.[0]?.results ?? []).slice(0, 5)
    : []
  const custResults = searchEnabled ? (customers.data?.pages?.[0]?.results ?? []).slice(0, 5) : []
  const msgResults = searchEnabled ? (messages.data?.pages?.[0]?.results ?? []).slice(0, 5) : []

  const hasResults = convResults.length > 0 || custResults.length > 0 || msgResults.length > 0

  const select = useCallback(
    (path: string) => {
      onOpenChange(false)
      setQuery("")
      navigate(path)
    },
    [navigate, onOpenChange],
  )

  const handleOpenChange = useCallback(
    (next: boolean) => {
      if (!next) setQuery("")
      onOpenChange(next)
    },
    [onOpenChange],
  )

  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent) => {
      if (event.key === "Tab" && canUseAdmin) {
        event.preventDefault()
        setScope((prev) => (prev === "app" ? "admin" : "app"))
      }
    },
    [canUseAdmin],
  )

  return (
    <CommandDialog open={open} onOpenChange={handleOpenChange}>
      <div onKeyDownCapture={handleKeyDown}>
        <CommandInput
          placeholder={
            activeScope === "admin"
              ? "Search admin portal pages…"
              : t("dashboard.search.placeholder", "Search by customer, subject, or content…")
          }
          value={query}
          onValueChange={setQuery}
        />

        {canUseAdmin && (
          <div className="flex items-center gap-2 border-b border-border/60 px-3 py-2">
            {(["app", "admin"] as NavScope[]).map((value) => (
              <button
                key={value}
                type="button"
                onClick={() => setScope(value)}
                className={cn(
                  "flex items-center gap-1.5 rounded-md px-2 py-1 text-xs font-medium transition-colors",
                  activeScope === value
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                {value === "app" ? (
                  <LayoutGrid className="h-3.5 w-3.5" />
                ) : (
                  <Shield className="h-3.5 w-3.5" />
                )}
                {value === "app" ? "App" : "Admin portal"}
              </button>
            ))}
            <span className="ml-auto text-[11px] text-muted-foreground">
              Press <kbd className="rounded border border-border px-1">Tab</kbd> to switch
            </span>
          </div>
        )}

        <CommandList>
          {activeScope === "app" && (
            <PaletteAvailabilityActions onDone={() => handleOpenChange(false)} />
          )}

          {/* Pages / navigation */}

          {groupedPages.map(([group, items]) => (
            <CommandGroup
              key={`${activeScope}-${group}`}
              heading={activeScope === "admin" ? `Admin · ${group}` : `Go to · ${group}`}
            >
              {items.map((page) => (
                <CommandItem
                  key={page.id}
                  value={`page-${page.id}-${page.title}-${page.path}`}
                  onSelect={() => select(page.path)}
                >
                  <ArrowRight className="mr-2 h-4 w-4 flex-shrink-0 text-muted-foreground" />
                  <div className="flex flex-col min-w-0">
                    <span className="truncate text-sm font-medium">{page.title}</span>
                    <span className="truncate text-xs text-muted-foreground">{page.path}</span>
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
          ))}

          {activeScope === "admin" && pageResults.length === 0 && (
            <CommandEmpty>No admin pages match "{query}".</CommandEmpty>
          )}

          {/* Loading state */}
          {isLoading && debouncedQuery.length >= 2 && (
            <div className="flex items-center justify-center py-6 text-sm text-muted-foreground">
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Searching…
            </div>
          )}

          {/* Empty state */}
          {activeScope === "app" &&
            !isLoading &&
            debouncedQuery.length >= 2 &&
            !hasResults &&
            pageResults.length === 0 && (
              <CommandEmpty>{t("dashboard.search.noResults", "No results found.")}</CommandEmpty>
            )}

          {/* Conversations */}
          {convResults.length > 0 && (
            <>
              <CommandSeparator />
              <CommandGroup heading="Conversations">
                {convResults.map((r) => (
                  <CommandItem
                    key={r.id}
                    value={`conv-${r.id}`}
                    onSelect={() => select(`/interactions/text/open?conversationId=${r.id}`)}
                  >
                    <MessageSquare className="mr-2 h-4 w-4 flex-shrink-0 text-muted-foreground" />
                    <div className="flex flex-col min-w-0">
                      <span className="truncate font-medium text-sm">
                        {r.subject || "(no subject)"}
                      </span>
                      {r.customer_name && (
                        <span className="truncate text-xs text-muted-foreground">
                          {r.customer_name}
                          {r.customer_email ? ` · ${r.customer_email}` : ""}
                        </span>
                      )}
                    </div>
                  </CommandItem>
                ))}
              </CommandGroup>
            </>
          )}

          {/* Customers */}
          {custResults.length > 0 && (
            <>
              <CommandSeparator />
              <CommandGroup heading="Customers">
                {custResults.map((r) => (
                  <CommandItem
                    key={r.id}
                    value={`cust-${r.id}`}
                    onSelect={() => select(`/customers/${r.id}`)}
                  >
                    <User className="mr-2 h-4 w-4 flex-shrink-0 text-muted-foreground" />
                    <div className="flex flex-col min-w-0">
                      <span className="truncate font-medium text-sm">
                        {r.customer_name || r.customer_email || "Unknown"}
                      </span>
                      {r.customer_email && r.customer_name && (
                        <span className="truncate text-xs text-muted-foreground">
                          {r.customer_email}
                        </span>
                      )}
                    </div>
                  </CommandItem>
                ))}
              </CommandGroup>
            </>
          )}

          {/* Messages */}
          {msgResults.length > 0 && (
            <>
              <CommandSeparator />
              <CommandGroup heading="Messages">
                {msgResults.map((r) => (
                  <CommandItem
                    key={r.id}
                    value={`msg-${r.id}`}
                    onSelect={() =>
                      select(`/interactions/text/open?conversationId=${r.conversation_id}`)
                    }
                  >
                    <Mail className="mr-2 h-4 w-4 flex-shrink-0 text-muted-foreground" />
                    <div className="flex flex-col min-w-0">
                      <span className="truncate font-medium text-sm">
                        {r.subject || "(no subject)"}
                      </span>
                      <span className="truncate text-xs text-muted-foreground line-clamp-1">
                        {stripHtml(r.content)?.substring(0, 120)}
                      </span>
                    </div>
                  </CommandItem>
                ))}
              </CommandGroup>
            </>
          )}

          {/* View all link */}
          {hasResults && (
            <>
              <CommandSeparator />
              <CommandGroup>
                <CommandItem
                  value="view-all-results"
                  onSelect={() => select(`/search?q=${encodeURIComponent(debouncedQuery)}`)}
                >
                  <ExternalLink className="mr-2 h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">View all results for "{debouncedQuery}"</span>
                </CommandItem>
              </CommandGroup>
            </>
          )}
        </CommandList>
      </div>
    </CommandDialog>
  )
}
