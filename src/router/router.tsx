import * as Sentry from "@sentry/react"
import { createRouter } from "@tanstack/react-router"
import { routeTree } from "./routeTree"

/**
 * App router instance. Attaches Sentry TanStack Router tracing after create
 * (instrument.ts already called Sentry.init without pulling in the route tree).
 */
export function createAppRouter() {
  // TanStack Router's public types require strictNullChecks; this project keeps it off
  // (see tsconfig.app.json). Cast keeps runtime behavior without a repo-wide strict flip.
  const next = createRouter({
    routeTree,
    defaultPreload: "intent",
    scrollRestoration: true,
  } as never)

  Sentry.addIntegration(Sentry.tanstackRouterBrowserTracingIntegration(next))
  void next.load()
  return next
}

export const router = createAppRouter()

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router
  }
}
