import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { render, screen } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"
import { BrowserRouter } from "@/router/compat"
import { UnifiedAppLayout } from "../UnifiedAppLayout"

// AppMainNav data hooks
vi.mock("@/hooks/usePermissions", () => ({
  usePermissions: () => ({
    isAdmin: () => false,
    isLoading: false,
  }),
}))

vi.mock("@/hooks/useAuth", () => ({
  useAuth: () => ({
    user: { id: "u1", email: "a@b.com" },
    profile: { id: "p1", full_name: "Agent" },
    isSuperAdmin: false,
    isAdmin: false,
    loading: false,
    signOut: vi.fn(),
  }),
}))

vi.mock("@/hooks/useOptimizedCounts", () => ({
  useOptimizedCounts: () => ({ data: {} }),
}))

vi.mock("@/hooks/useSidebarNavCounts", () => ({
  useSidebarNavCounts: () => ({ textOpen: 0, chatActive: 0 }),
}))

vi.mock("@/hooks/useDateFormatting", () => ({
  useDateFormatting: () => ({ dateTime: () => "Jan 1, 2024 12:00", timezone: "UTC" }),
}))

// UnifiedAppLayout peripheral side-effect hooks
vi.mock("@/hooks/useNotificationPermissionPrompt", () => ({
  useNotificationPermissionPrompt: () => {},
}))
vi.mock("@/hooks/useDesktopEmailNotifications", () => ({
  useDesktopEmailNotifications: () => {},
}))
vi.mock("@/hooks/useOpenConversationsBadge", () => ({
  useOpenConversationsBadge: () => {},
}))

// UnifiedAppLayout peripheral child components (not under test here)
vi.mock("@/components/search/SearchCommandPalette", () => ({ SearchCommandPalette: () => null }))
vi.mock("../QuickInboxSwitcher", () => ({ QuickInboxSwitcher: () => null }))
vi.mock("@/features/whats-new/WhatsNewDialog", () => ({ WhatsNewDialog: () => null }))
vi.mock("@/components/live-chat/NewChatAlertBanner", () => ({ NewChatAlertBanner: () => null }))
vi.mock("../MobileEdgeSwipe", () => ({ MobileEdgeSwipe: () => null }))
vi.mock("../MobileBottomNav", () => ({ MobileBottomNav: () => null }))
vi.mock("../AgentAvailabilityPanel", () => ({ AgentAvailabilityPanel: () => null }))

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string, fallback: string) => fallback,
  }),
}))

// The sidebar persists its open/closed state in localStorage and defaults to
// collapsed. Provide a working store that reports "open" so the expanded
// sidebar structure (branding + group labels) renders.
const localStorageStore: Record<string, string> = {
  "support-hub:sidebar-open": "true",
}
Object.defineProperty(window, "localStorage", {
  configurable: true,
  value: {
    getItem: (key: string) => localStorageStore[key] ?? null,
    setItem: (key: string, value: string) => {
      localStorageStore[key] = value
    },
    removeItem: (key: string) => {
      delete localStorageStore[key]
    },
    clear: () => {},
  },
})

const renderWithProviders = (component: React.ReactElement) => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })

  return render(
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>{component}</BrowserRouter>
    </QueryClientProvider>,
  )
}

describe("UnifiedAppLayout", () => {
  it("renders sidebar navigation with correct structure", async () => {
    renderWithProviders(
      <UnifiedAppLayout>
        <div>Test Content</div>
      </UnifiedAppLayout>,
    )

    // Sidebar branding (the compat router resolves matches asynchronously)
    expect(await screen.findByText("Support Hub")).toBeInTheDocument()

    // Check that sidebar groups are rendered
    expect(screen.getByText("Interactions")).toBeInTheDocument()
    expect(screen.getByText("Marketing")).toBeInTheDocument()
    expect(screen.getByText("Operations")).toBeInTheDocument()
    expect(screen.getByText("Settings")).toBeInTheDocument()

    // Admin should not be visible for regular users
    expect(screen.queryByText("Admin")).not.toBeInTheDocument()

    // Check that content is rendered
    expect(screen.getByText("Test Content")).toBeInTheDocument()
  })

  it("renders without a top header bar", async () => {
    renderWithProviders(
      <UnifiedAppLayout>
        <div>Test Content</div>
      </UnifiedAppLayout>,
    )

    await screen.findByText("Support Hub")

    // No banner role — header has been removed
    expect(screen.queryByRole("banner")).not.toBeInTheDocument()
    // Old header branding should be gone
    expect(screen.queryByText("Customer Support")).not.toBeInTheDocument()
  })
})
