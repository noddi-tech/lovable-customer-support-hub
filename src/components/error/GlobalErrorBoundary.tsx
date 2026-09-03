import * as Sentry from "@sentry/react"
import type React from "react"
import { Component, type ReactNode } from "react"
import { isChunkLoadError, reloadOnceForChunkError } from "@/utils/chunkReload"
import { logger } from "@/utils/logger"

interface Props {
  children: ReactNode
  suppressAnalyticsErrors?: boolean
  suppressIframeErrors?: boolean
}

interface State {
  hasError: boolean
  error?: Error
}

export class GlobalErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError(error: Error): State {
    // Always render a visible fallback — suppression only controls reporting,
    // never leaves an empty #root behind.
    return { hasError: true, error }
  }

  static shouldSuppressError(error: Error): boolean {
    // Chunk/module load errors are recoverable by reloading — never suppress.
    if (isChunkLoadError(error)) return false

    const message = error.message?.toLowerCase() || ""
    const stack = error.stack?.toLowerCase() || ""

    // Suppress analytics errors (RudderStack, etc.)
    if (
      message.includes("rudderstack") ||
      message.includes("analytics") ||
      message.includes("blocked_by_client") ||
      stack.includes("rudderstack")
    ) {
      return true
    }

    // Suppress iframe postMessage errors
    if (
      message.includes("postmessage") ||
      message.includes("cross-origin") ||
      message.includes("noddi.co") ||
      message.includes("iframe")
    ) {
      return true
    }

    // Narrow network suppression: only genuine transport failures, not any
    // message that happens to contain the word "fetch".
    if (
      message.includes("failed to fetch") ||
      message.includes("networkerror") ||
      message.includes("network request failed") ||
      message.includes("cors") ||
      message.includes("edge function")
    ) {
      return true
    }

    return false
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // Stale code-split chunk after a redeploy → recover with one reload.
    if (isChunkLoadError(error)) {
      logger.warn("Stale chunk error caught by boundary", { error: error.message }, "GlobalErrorBoundary")
      reloadOnceForChunkError("GlobalErrorBoundary")
      return
    }

    if (GlobalErrorBoundary.shouldSuppressError(error)) {
      // Log suppressed errors for debugging; still show the fallback so the
      // app never renders an empty root.
      logger.debug(
        "Suppressed error",
        {
          error: error.message,
          stack: error.stack,
          errorInfo,
        },
        "GlobalErrorBoundary",
      )
      return
    }


    Sentry.captureException(error, {
      contexts: { react: { componentStack: errorInfo.componentStack } },
    })

    // Log critical errors
    logger.error(
      "Critical error caught by boundary",
      {
        error: error.message,
        stack: error.stack,
        errorInfo,
      },
      "GlobalErrorBoundary",
    )
  }

  componentDidMount() {
    // Handle unhandled promise rejections
    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      const error = event.reason
      if (isChunkLoadError(error)) {
        event.preventDefault()
        reloadOnceForChunkError("GlobalErrorBoundary:unhandledrejection")
        return
      }
      if (error && GlobalErrorBoundary.shouldSuppressError(error)) {
        event.preventDefault()
        logger.debug("Suppressed promise rejection", { error }, "GlobalErrorBoundary")
      }
    }


    // Handle global window errors
    const handleWindowError = (event: ErrorEvent) => {
      if (event.error && GlobalErrorBoundary.shouldSuppressError(event.error)) {
        event.preventDefault()
        event.stopPropagation()
        logger.debug("Suppressed window error", { error: event.error }, "GlobalErrorBoundary")
        return false
      }
    }

    window.addEventListener("unhandledrejection", handleUnhandledRejection)
    window.addEventListener("error", handleWindowError, true)

    // Cleanup on unmount
    return () => {
      window.removeEventListener("unhandledrejection", handleUnhandledRejection)
      window.removeEventListener("error", handleWindowError, true)
    }
  }

  render() {
    // For suppressed errors or no errors, render children normally
    if (!this.state.hasError) {
      return this.props.children
    }

    // Only show error UI for critical errors
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center max-w-md p-6">
          <h2 className="text-xl font-semibold text-foreground mb-2">Something went wrong</h2>
          <p className="text-muted-foreground mb-4">Please refresh the page to continue.</p>
          <button
            type="button"
            onClick={() => {
              console.log("🔄 [GlobalErrorBoundary] Attempting recovery without reload")
              this.setState({ hasError: false, error: undefined })
              window.dispatchEvent(new CustomEvent("global-error-reset"))
            }}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
          >
            Try to Recover
          </button>
        </div>
      </div>
    )
  }
}
