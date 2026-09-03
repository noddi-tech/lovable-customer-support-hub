import "@testing-library/jest-dom"
import { afterEach, beforeAll, vi } from "vitest"

// Mock Supabase client
vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user: null }, error: null }),
      getSession: vi.fn().mockResolvedValue({ data: { session: null }, error: null }),
      signOut: vi.fn().mockResolvedValue({ error: null }),
      onAuthStateChange: vi.fn(() => ({ data: { subscription: { unsubscribe: vi.fn() } } })),
    },
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      insert: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(),
      delete: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      neq: vi.fn().mockReturnThis(),
      in: vi.fn().mockReturnThis(),
      is: vi.fn().mockReturnThis(),
      gte: vi.fn().mockReturnThis(),
      lte: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      range: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: null, error: null }),
      maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
    })),
    rpc: vi.fn().mockResolvedValue({ data: [], error: null }),
    functions: {
      invoke: vi.fn().mockResolvedValue({ data: null, error: null }),
    },
    channel: vi.fn(() => ({
      on: vi.fn().mockReturnThis(),
      subscribe: vi.fn(),
    })),
    removeChannel: vi.fn(),
  },
}))

// Mock react-i18next
vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string, fallback?: string) => fallback || key,
    i18n: {
      changeLanguage: vi.fn(),
    },
  }),
}))

// Mock logger
vi.mock("@/utils/logger", () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
    getRecentLogs: vi.fn(() => []),
    clearLogs: vi.fn(),
    exportLogs: vi.fn(() => ""),
    trackComponentRender: vi.fn(),
    trackParseCache: vi.fn(),
    trackSlowOperation: vi.fn(),
    trackMemoBreak: vi.fn(),
    trackParseCall: vi.fn(),
    getDebugMetrics: vi.fn(() => ({})),
    clearDebugMetrics: vi.fn(),
    time: vi.fn(),
    timeEnd: vi.fn(),
  },
}))

// Mock auth so component tests don't require an AuthProvider
vi.mock("@/hooks/useAuth", () => ({
  useAuth: () => ({
    user: { id: "test-user", email: "agent@test.com" },
    currentUser: { id: "test-user", email: "agent@test.com" },
    session: null,
    profile: null,
    loading: false,
    authLoading: false,
    isProcessingOAuth: false,
    isAdmin: false,
    isSuperAdmin: false,
    role: "agent",
    memberships: [],
    accessibleOrganizations: [],
    allowedLocalOrgIds: [],
    currentMembership: null,
    currentOrganizationId: null,
    organizationId: null,
    isScopeEmpty: false,
    signOut: vi.fn(),
    refreshSession: vi.fn(),
    validateSession: vi.fn(),
  }),
}))

// Mock toast
vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
    warning: vi.fn(),
  },
}))

// Global test setup
beforeAll(() => {
  // jsdom does not implement scrollTo; TanStack Router scroll restoration calls it.
  window.scrollTo = vi.fn()

  // Mock window.matchMedia for responsive hooks
  Object.defineProperty(window, "matchMedia", {
    writable: true,
    value: vi.fn().mockImplementation((query) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  })

  // Mock ResizeObserver
  global.ResizeObserver = vi.fn().mockImplementation(() => ({
    observe: vi.fn(),
    unobserve: vi.fn(),
    disconnect: vi.fn(),
  }))

  // Mock IntersectionObserver
  global.IntersectionObserver = vi.fn().mockImplementation(() => ({
    observe: vi.fn(),
    unobserve: vi.fn(),
    disconnect: vi.fn(),
  }))
})

afterEach(() => {
  vi.clearAllMocks()
})
