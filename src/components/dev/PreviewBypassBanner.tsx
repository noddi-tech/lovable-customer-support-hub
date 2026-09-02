import { disablePreviewBypass, isPreviewBypassEnabled } from "@/lib/dev-preview-auth"

/**
 * Dev-only banner shown while the login bypass is active, so it can never be
 * mistaken for a real session. Renders nothing in production builds.
 */
export const PreviewBypassBanner = () => {
  if (!isPreviewBypassEnabled()) return null

  return (
    <div className="fixed bottom-3 left-1/2 z-[9999] -translate-x-1/2 rounded-full border border-warning/40 bg-warning/15 px-4 py-1.5 text-xs text-warning-foreground shadow-lg backdrop-blur">
      <span className="font-medium">Preview mode — not signed in.</span>{" "}
      <span className="opacity-80">Data behind auth stays empty.</span>{" "}
      <button
        type="button"
        className="ml-1 underline underline-offset-2"
        onClick={() => {
          disablePreviewBypass()
          window.location.assign("/auth")
        }}
      >
        Exit
      </button>
    </div>
  )
}
