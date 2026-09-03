const SUPABASE_URL = "https://qgfaycwsangsqzpveoup.supabase.co"

export interface LiveBuild {
  publishedAt: string
  commit: string
  size?: number
}

// Session-scoped cache. The public manifest 404s (as a 400) until the widget is
// first deployed, so refetching on every component mount / sidebar navigation
// spams the console with failed requests. Cache the resolved value (or null when
// unpublished) once per page load; `refresh` forces a re-fetch after a deploy.
let cache: Promise<LiveBuild | null> | null = null

async function load(): Promise<LiveBuild | null> {
  try {
    const res = await fetch(
      `${SUPABASE_URL}/storage/v1/object/public/widget/widget-build.json?t=${Date.now()}`,
    )
    if (!res.ok) return null
    return (await res.json()) as LiveBuild
  } catch {
    return null
  }
}

export function fetchLiveBuild(): Promise<LiveBuild | null> {
  if (cache === null) cache = load()
  return cache
}

export function setLiveBuildCache(build: LiveBuild | null): void {
  cache = Promise.resolve(build)
}

export function refreshLiveBuild(): Promise<LiveBuild | null> {
  cache = load()
  return cache
}
