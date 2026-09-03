/**
 * React Router–shaped API on top of TanStack Router.
 * Lets the app keep navigate(string), useSearchParams, Link to="/path", etc.
 * Prefer typed APIs from `@tanstack/react-router` for new code.
 */
import {
  createMemoryHistory,
  createRootRoute,
  createRoute,
  createRouter,
  Outlet,
  RouterProvider,
  useRouter,
  useRouterState,
  useParams as useTsrParams,
} from "@tanstack/react-router"
import {
  type ComponentProps,
  type MouseEvent,
  type ReactNode,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react"

export type To = string | number | { pathname?: string; search?: string; hash?: string }

export interface NavigateOptions {
  replace?: boolean
  state?: unknown
}

type SetURLSearchParams = (
  nextInit?:
    | URLSearchParams
    | Record<string, string | string[]>
    | ((prev: URLSearchParams) => URLSearchParams | Record<string, string | string[]>),
  navigateOpts?: { replace?: boolean },
) => void

function parseTo(to: string): { pathname: string; search: string; hash: string } {
  const hashIndex = to.indexOf("#")
  const hash = hashIndex >= 0 ? to.slice(hashIndex) : ""
  const withoutHash = hashIndex >= 0 ? to.slice(0, hashIndex) : to
  const searchIndex = withoutHash.indexOf("?")
  const search = searchIndex >= 0 ? withoutHash.slice(searchIndex) : ""
  const pathname = searchIndex >= 0 ? withoutHash.slice(0, searchIndex) : withoutHash
  return { pathname: pathname || "/", search, hash }
}

function toHistoryTarget(to: Exclude<To, number>) {
  if (typeof to === "string") {
    return parseTo(to)
  }
  return {
    pathname: to.pathname ?? "/",
    search: to.search ? (to.search.startsWith("?") ? to.search : `?${to.search}`) : "",
    hash: to.hash ? (to.hash.startsWith("#") ? to.hash : `#${to.hash}`) : "",
  }
}

function toHref(to: Exclude<To, number>) {
  const t = toHistoryTarget(to)
  return `${t.pathname}${t.search}${t.hash}`
}

/** RR-compatible navigate: string path, delta, or path object. */
export function useNavigate() {
  const router = useRouter()

  return useCallback(
    (to: To, options?: NavigateOptions) => {
      if (typeof to === "number") {
        router.history.go(to)
        return
      }

      const href = toHref(to)
      if (options?.replace) {
        router.history.replace(href, options.state)
      } else {
        router.history.push(href, options.state)
      }
    },
    [router],
  )
}

export function useLocation() {
  return useRouterState({
    select: (s) => ({
      pathname: s.location.pathname,
      search: s.location.searchStr.startsWith("?")
        ? s.location.searchStr
        : s.location.searchStr
          ? `?${s.location.searchStr}`
          : "",
      hash: s.location.hash
        ? s.location.hash.startsWith("#")
          ? s.location.hash
          : `#${s.location.hash}`
        : "",
      state: s.location.state,
      key: String((s.location.state as { key?: string } | undefined)?.key ?? s.location.href),
    }),
  })
}

export function useParams<T extends Record<string, string | undefined> = Record<string, string>>() {
  const params = useTsrParams({ strict: false })
  return useMemo(() => {
    const out = { ...params } as T & { "*"?: string }
    if (params._splat != null && out["*"] == null) {
      ;(out as { "*": string })["*"] = params._splat
    }
    return out
  }, [params])
}

export function useSearchParams(): [URLSearchParams, SetURLSearchParams] {
  const router = useRouter()
  const searchStr = useRouterState({
    select: (s) => s.location.searchStr,
  })

  const searchParams = useMemo(() => {
    const raw = searchStr.startsWith("?") ? searchStr.slice(1) : searchStr
    return new URLSearchParams(raw)
  }, [searchStr])

  const setSearchParams = useCallback<SetURLSearchParams>(
    (nextInit, navigateOpts) => {
      const prevRaw = router.state.location.searchStr
      const prev = new URLSearchParams(prevRaw.startsWith("?") ? prevRaw.slice(1) : prevRaw)

      let next: URLSearchParams
      if (typeof nextInit === "function") {
        const result = nextInit(prev)
        next =
          result instanceof URLSearchParams
            ? result
            : new URLSearchParams(result as Record<string, string>)
      } else if (nextInit instanceof URLSearchParams) {
        next = nextInit
      } else if (nextInit && typeof nextInit === "object") {
        next = new URLSearchParams()
        for (const [k, v] of Object.entries(nextInit)) {
          if (Array.isArray(v)) {
            for (const item of v) next.append(k, item)
          } else if (v != null) {
            next.set(k, String(v))
          }
        }
      } else {
        next = new URLSearchParams()
      }

      const qs = next.toString()
      const hashRaw = router.state.location.hash
      const hash = hashRaw ? (hashRaw.startsWith("#") ? hashRaw : `#${hashRaw}`) : ""
      const href = `${router.state.location.pathname}${qs ? `?${qs}` : ""}${hash}`
      if (navigateOpts?.replace) router.history.replace(href)
      else router.history.push(href)
    },
    [router],
  )

  return [searchParams, setSearchParams]
}

export interface LinkProps extends Omit<ComponentProps<"a">, "href" | "className"> {
  to: To
  replace?: boolean
  state?: unknown
  children?: ReactNode
  /** When true, only active if the path matches exactly (RR NavLink `end`). */
  end?: boolean
  className?: string | ((args: { isActive: boolean; isPending: boolean }) => string | undefined)
}

function pathIsActive(pathname: string, toPathname: string, end?: boolean) {
  if (end || toPathname === "/") return pathname === toPathname
  return pathname === toPathname || pathname.startsWith(`${toPathname}/`)
}

export function Link({
  to,
  replace,
  state,
  children,
  onClick,
  end,
  className,
  ...rest
}: LinkProps) {
  const router = useRouter()
  const pathname = useRouterState({ select: (s) => s.location.pathname })

  if (typeof to === "number") {
    throw new Error("Link does not support numeric history deltas")
  }

  const target = toHistoryTarget(to)
  const href = `${target.pathname}${target.search}${target.hash}`
  const isActive = pathIsActive(pathname, target.pathname, end)
  const resolvedClassName =
    typeof className === "function" ? className({ isActive, isPending: false }) : className

  return (
    <a
      href={href}
      className={resolvedClassName}
      onClick={(e: MouseEvent<HTMLAnchorElement>) => {
        onClick?.(e)
        if (e.defaultPrevented) return
        if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return
        e.preventDefault()
        if (replace) router.history.replace(href, state)
        else router.history.push(href, state)
      }}
      {...rest}
    >
      {children}
    </a>
  )
}

/** RR NavLink — same as Link with active className helper support. */
export const NavLink = Link

export function Navigate({
  to,
  replace = false,
  state,
}: {
  to: To
  replace?: boolean
  state?: unknown
}) {
  const navigate = useNavigate()

  useEffect(() => {
    navigate(to, { replace, state })
  }, [navigate, to, replace, state])

  return null
}

export { Outlet }

/**
 * Test / Storybook wrapper that provides TanStack Router context
 * while rendering arbitrary children (React Router BrowserRouter shape).
 */
const browserRouterChildrenRef: { current: ReactNode } = { current: null }

function BrowserRouterTestLeaf() {
  return <>{browserRouterChildrenRef.current}</>
}

const EMPTY_INITIAL_ENTRIES = ["/"]

export function BrowserRouter({
  children,
  initialEntries = EMPTY_INITIAL_ENTRIES,
}: {
  children: ReactNode
  initialEntries?: string[]
}) {
  browserRouterChildrenRef.current = children

  const [router] = useState(() => {
    const rootRoute = createRootRoute({
      component: () => <Outlet />,
    })
    const indexRoute = createRoute({
      getParentRoute: () => rootRoute,
      path: "/",
      component: BrowserRouterTestLeaf,
    })
    // Match any deeper path so tests can mount at /settings, /voice, etc.
    const splatRoute = createRoute({
      getParentRoute: () => rootRoute,
      path: "/$",
      component: BrowserRouterTestLeaf,
    })

    // TanStack Router types require strictNullChecks; this project has it off.
    const next = createRouter({
      routeTree: rootRoute.addChildren([indexRoute, splatRoute]),
      history: createMemoryHistory({ initialEntries }),
      scrollRestoration: false,
    } as never)
    // Ensure matches exist before first paint in tests (jsdom).
    void next.load()
    return next
  })

  return <RouterProvider router={router} />
}

export const MemoryRouter = BrowserRouter
