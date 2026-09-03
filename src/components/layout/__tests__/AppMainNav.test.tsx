import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { render, screen } from "@testing-library/react"
import { vi } from "vitest"
import { SidebarProvider } from "@/components/ui/sidebar"
import { BrowserRouter } from "@/router/compat"
import { AppMainNav } from "../AppMainNav"

// Mock the hooks
vi.mock("@/hooks/usePermissions", () => ({
  usePermissions: () => ({
    isAdmin: vi.fn(() => true),
    isLoading: false,
  }),
}))

vi.mock("@/hooks/useAuth", () => ({
  useAuth: () => ({
    user: { id: "u1", email: "a@b.com" },
    profile: { id: "p1", full_name: "Agent" },
    isSuperAdmin: false,
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
  useDateFormatting: () => ({
    formatDate: () => "Jan 1, 2024",
    dateTime: () => "Jan 1, 2024 12:00",
    date: () => "Jan 1, 2024",
    time: () => "12:00",
  }),
}))

vi.mock("../AgentAvailabilityPanel", () => ({
  AgentAvailabilityPanel: () => null,
}))

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string, fallback: string) => fallback,
  }),
}))

const TestWrapper = ({
  children,
  initialPath = "/",
}: {
  children: React.ReactNode
  initialPath?: string
}) => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })

  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter initialEntries={[initialPath]}>
        <SidebarProvider>{children}</SidebarProvider>
      </BrowserRouter>
    </QueryClientProvider>
  )
}

describe("AppMainNav Active States", () => {
  it("should highlight interactions/text as active on root path", async () => {
    render(
      <TestWrapper initialPath="/">
        <AppMainNav />
      </TestWrapper>,
    )

    const textMessagesLink = await screen.findByRole("link", { name: /^inbox$/i })
    expect(textMessagesLink).toHaveAttribute("aria-current", "page")
  })

  it("should highlight voice as active on /voice path", async () => {
    render(
      <TestWrapper initialPath="/voice">
        <AppMainNav />
      </TestWrapper>,
    )

    const voiceLink = await screen.findByRole("link", { name: /voice calls/i })
    expect(voiceLink).toHaveAttribute("aria-current", "page")
  })

  it("should highlight campaigns as active on /marketing path", async () => {
    render(
      <TestWrapper initialPath="/marketing">
        <AppMainNav />
      </TestWrapper>,
    )

    const campaignsLink = await screen.findByRole("link", { name: /campaigns/i })
    expect(campaignsLink).toHaveAttribute("aria-current", "page")
  })

  it("should highlight service tickets as active on /operations path", async () => {
    render(
      <TestWrapper initialPath="/operations">
        <AppMainNav />
      </TestWrapper>,
    )

    const ticketsLink = await screen.findByRole("link", { name: /service tickets/i })
    expect(ticketsLink).toHaveAttribute("aria-current", "page")
  })

  it("should highlight settings/general as active on /settings path", async () => {
    render(
      <TestWrapper initialPath="/settings">
        <AppMainNav />
      </TestWrapper>,
    )

    const generalLink = await screen.findByRole("link", { name: /^general$/i })
    expect(generalLink).toHaveAttribute("aria-current", "page")
  })
})
