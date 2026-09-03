import { Loader2, Rocket, X } from "lucide-react"
import type React from "react"
import { useCallback, useEffect, useState } from "react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { useAuth } from "@/hooks/useAuth"
import { cn } from "@/lib/utils"
import {
  fetchLiveBuild as fetchLiveBuildCached,
  type LiveBuild,
  refreshLiveBuild,
  setLiveBuildCache,
} from "@/lib/widgetBuild"

const SUPABASE_URL = "https://qgfaycwsangsqzpveoup.supabase.co"

/**
 * Home-page call to action shown when the published widget bundle is behind the
 * current app build (or was never deployed). It mirrors WidgetDeployPanel's
 * staleness check — compare the git commit in the storage manifest against this
 * app build's __APP_COMMIT__ — and lets an admin publish a fresh release in one
 * click. Renders nothing when the widget is already up to date.
 */
export const WidgetReleaseBanner: React.FC = () => {
  const { isAdmin } = useAuth()
  const [liveBuild, setLiveBuild] = useState<LiveBuild | null>(null)
  const [loaded, setLoaded] = useState(false)
  const [deploying, setDeploying] = useState(false)
  const [dismissed, setDismissed] = useState(false)

  const appCommit = typeof __APP_COMMIT__ !== "undefined" ? __APP_COMMIT__ : "unknown"

  const fetchLiveBuild = useCallback(async () => {
    setLiveBuild(await fetchLiveBuildCached())
    setLoaded(true)
  }, [])

  useEffect(() => {
    if (isAdmin) void fetchLiveBuild()
  }, [isAdmin, fetchLiveBuild])

  const handleDeploy = async () => {
    setDeploying(true)
    try {
      const response = await fetch(`${SUPABASE_URL}/functions/v1/deploy-widget?action=deploy`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ commit: appCommit }),
      })
      if (!response.ok) throw new Error("Deploy failed")
      const result = await response.json()
      if (result.publishedAt) {
        const build = {
          publishedAt: result.publishedAt,
          commit: result.commit,
          size: result.size,
        }
        setLiveBuildCache(build)
        setLiveBuild(build)
      } else {
        setLiveBuild(await refreshLiveBuild())
      }
      toast.success("Widget released to production!", {
        description: "Host sites pick it up on their next load (CDN cache up to ~1 hour).",
      })
    } catch {
      toast.error("Failed to release widget", { description: "Check edge function logs." })
    } finally {
      setDeploying(false)
    }
  }

  // Only surface when the operator can act and there is something to publish.
  if (!isAdmin || !loaded || dismissed || appCommit === "unknown") return null
  const neverDeployed = !liveBuild
  const isStale = !!liveBuild && liveBuild.commit !== appCommit
  if (!neverDeployed && !isStale) return null

  return (
    <Card
      className={cn(
        "flex flex-col gap-3 border-amber-300 bg-amber-50 p-4 sm:flex-row sm:items-center sm:justify-between",
        "dark:border-amber-900/50 dark:bg-amber-950/20",
      )}
    >
      <div className="flex items-start gap-3 min-w-0">
        <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-amber-500 animate-pulse" />
        <div className="min-w-0">
          <p className="text-sm font-semibold text-amber-900 dark:text-amber-200">
            {neverDeployed
              ? "The chat widget has never been published"
              : "A newer chat widget is ready to release"}
          </p>
          <p className="text-xs text-amber-800/80 dark:text-amber-300/80">
            {neverDeployed
              ? "Publish the widget bundle so customers get the live chat & AI assistant on your sites."
              : "The published widget is behind the latest changes. Release it so customers get the newest version."}
          </p>
        </div>
      </div>
      <div className="flex items-center gap-2 sm:shrink-0">
        <Button
          size="sm"
          onClick={handleDeploy}
          disabled={deploying}
          className="gap-2 bg-amber-600 text-white hover:bg-amber-700"
        >
          {deploying ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Releasing…
            </>
          ) : (
            <>
              <Rocket className="h-4 w-4" />
              Release now
            </>
          )}
        </Button>
        <Button
          size="icon"
          variant="ghost"
          className="h-8 w-8 text-amber-800 hover:bg-amber-100 dark:text-amber-300 dark:hover:bg-amber-900/30"
          onClick={() => setDismissed(true)}
          aria-label="Dismiss"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
    </Card>
  )
}
