import { ApiReferenceReact } from "@scalar/api-reference-react"
import { useMemo } from "react"
import "@scalar/api-reference-react/style.css"
import { BookOpen, Plug } from "lucide-react"
import { UnifiedAppLayout } from "@/components/layout/UnifiedAppLayout"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { SidebarTrigger } from "@/components/ui/sidebar"
import spec from "@/data/openapi.generated.json"
import { Link } from "@/router/compat"

/**
 * Renders the generated OpenAPI document for every edge function this service
 * exposes, using Scalar. The spec is produced by scripts/generate-openapi.ts.
 */
export default function ApiDocsPage() {
  const content = useMemo(() => {
    const base = import.meta.env.VITE_SUPABASE_URL as string | undefined
    const doc = structuredClone(spec) as Record<string, any>
    if (base) {
      doc.servers = [{ url: base, description: "This project" }]
    }
    return doc
  }, [])

  const endpointCount = Object.keys((spec as { paths: Record<string, unknown> }).paths).length

  return (
    <UnifiedAppLayout>
      <div className="flex h-full flex-col overflow-hidden">
        <header className="sticky top-0 z-10 border-b bg-background/95 px-3 py-3 backdrop-blur sm:px-6">
          <div className="flex items-center gap-3">
            <SidebarTrigger className="md:hidden" />
            <div className="min-w-0 flex-1">
              <h1 className="flex items-center gap-2 text-lg font-semibold">
                <Plug className="h-5 w-5 text-muted-foreground" />
                API reference
              </h1>
              <p className="hidden truncate text-xs text-muted-foreground sm:block">
                Every edge function endpoint, generated from the source at build time.
              </p>
            </div>
            <Badge variant="secondary" className="hidden sm:inline-flex text-[10px]">
              {endpointCount} endpoints
            </Badge>
            <Button asChild variant="outline" size="sm">
              <Link to="/docs">
                <BookOpen className="mr-1.5 h-4 w-4" />
                Docs
              </Link>
            </Button>
          </div>
        </header>

        <div className="min-h-0 flex-1 overflow-auto">
          <ApiReferenceReact
            configuration={{
              content,
              hideDownloadButton: false,
              darkMode: document.documentElement.classList.contains("dark"),
              layout: "modern",
              withDefaultFonts: false,
            }}
          />
        </div>
      </div>
    </UnifiedAppLayout>
  )
}
