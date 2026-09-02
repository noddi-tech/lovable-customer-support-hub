import { ExternalLink, Globe, HelpCircle, Lock, Search } from "lucide-react"
import type React from "react"
import { useMemo, useState } from "react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { EDGE_FUNCTIONS, EDGE_FUNCTIONS_GENERATED_AT } from "@/data/edge-functions.generated"

const SUPABASE_PROJECT_REF = "qgfaycwsangsqzpveoup"

type AuthFilter = "all" | "protected" | "public" | "unset"

export const EdgeFunctionsOverview: React.FC = () => {
  const [query, setQuery] = useState("")
  const [authFilter, setAuthFilter] = useState<AuthFilter>("all")

  const counts = useMemo(
    () => ({
      all: EDGE_FUNCTIONS.length,
      protected: EDGE_FUNCTIONS.filter((f) => f.verifyJwt === true).length,
      public: EDGE_FUNCTIONS.filter((f) => f.verifyJwt === false).length,
      unset: EDGE_FUNCTIONS.filter((f) => f.verifyJwt === null).length,
    }),
    [],
  )

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return EDGE_FUNCTIONS.filter((fn) => {
      if (authFilter === "protected" && fn.verifyJwt !== true) return false
      if (authFilter === "public" && fn.verifyJwt !== false) return false
      if (authFilter === "unset" && fn.verifyJwt !== null) return false
      if (!q) return true
      return (
        fn.name.toLowerCase().includes(q) ||
        fn.description.toLowerCase().includes(q) ||
        fn.secrets.some((s) => s.toLowerCase().includes(q))
      )
    })
  }, [query, authFilter])

  const filters: { key: AuthFilter; label: string }[] = [
    { key: "all", label: `All (${counts.all})` },
    { key: "protected", label: `JWT required (${counts.protected})` },
    { key: "public", label: `Public (${counts.public})` },
    { key: "unset", label: `Not configured (${counts.unset})` },
  ]

  return (
    <Card className="bg-gradient-surface border-border/50 shadow-surface">
      <CardHeader>
        <CardTitle className="text-primary">Edge Functions</CardTitle>
        <CardDescription>
          All {EDGE_FUNCTIONS.length} Supabase edge functions in this app, with their auth mode and
          the secrets they read. Generated from the codebase on{" "}
          {new Date(EDGE_FUNCTIONS_GENERATED_AT).toLocaleDateString()}.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-col gap-3 md:flex-row md:items-center">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by name, description or secret…"
              className="pl-9"
            />
          </div>
          <div className="flex flex-wrap gap-2">
            {filters.map((f) => (
              <Button
                key={f.key}
                size="sm"
                variant={authFilter === f.key ? "default" : "outline"}
                onClick={() => setAuthFilter(f.key)}
              >
                {f.label}
              </Button>
            ))}
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {filtered.map((fn) => (
            <div
              key={fn.name}
              className="rounded-lg border border-border/60 bg-background/40 p-3 space-y-2"
            >
              <div className="flex items-start justify-between gap-2">
                <code className="text-sm font-medium break-all">{fn.name}</code>
                <a
                  href={`https://supabase.com/dashboard/project/${SUPABASE_PROJECT_REF}/functions/${fn.name}/logs`}
                  target="_blank"
                  rel="noreferrer"
                  className="text-muted-foreground hover:text-primary shrink-0"
                  title="Open logs"
                  aria-label={`Open logs for ${fn.name}`}
                >
                  <ExternalLink className="h-4 w-4" />
                </a>
              </div>

              {fn.description && (
                <p className="text-xs text-muted-foreground line-clamp-3">{fn.description}</p>
              )}

              <div className="flex flex-wrap items-center gap-1.5">
                {fn.verifyJwt === true && (
                  <Badge variant="secondary" className="gap-1">
                    <Lock className="h-3 w-3" /> JWT required
                  </Badge>
                )}
                {fn.verifyJwt === false && (
                  <Badge variant="outline" className="gap-1">
                    <Globe className="h-3 w-3" /> Public
                  </Badge>
                )}
                {fn.verifyJwt === null && (
                  <Badge variant="outline" className="gap-1 text-muted-foreground">
                    <HelpCircle className="h-3 w-3" /> Not configured
                  </Badge>
                )}
                <Badge variant="outline">{fn.lines} lines</Badge>
              </div>

              {fn.secrets.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {fn.secrets.map((s) => (
                    <span
                      key={s}
                      className="rounded bg-muted px-1.5 py-0.5 text-[10px] font-mono text-muted-foreground"
                    >
                      {s}
                    </span>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>

        {filtered.length === 0 && (
          <p className="text-sm text-muted-foreground">No edge functions match your search.</p>
        )}
      </CardContent>
    </Card>
  )
}
