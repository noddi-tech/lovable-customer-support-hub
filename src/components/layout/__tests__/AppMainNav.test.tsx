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
  it("should highlight inbox as active on /interactions/text path", async () => {
    render(
      <TestWrapper initialPath="/interactions/text">
        <AppMainNav />
      </TestWrapper>,
    )

    const textMessagesLink = await screen.findByRole("link", { name: /^inbox$/i })
    expect(textMessagesLink).toHaveAttribute("aria-current", "page")
  })

  it("should highlight voice as active on /interactions/voice path", async () => {
    render(
      <TestWrapper initialPath="/interactions/voice">
        <AppMainNav />
      </TestWrapper>,
    )

    const voiceLink = await screen.findByRole("link", { name: /voice calls/i })
    expect(voiceLink).toHaveAttribute("aria-current", "page")
  })

  it("should highlight campaigns as active on /marketing/campaigns path", async () => {
    render(
      <TestWrapper initialPath="/marketing/campaigns">
        <AppMainNav />
      </TestWrapper>,
    )

    const campaignsLink = await screen.findByRole("link", { name: /campaigns/i })
    expect(campaignsLink).toHaveAttribute("aria-current", "page")
  })

  it("should highlight ops tickets as active on /operations/tickets path", async () => {
    render(
      <TestWrapper initialPath="/operations/tickets">
        <AppMainNav />
      </TestWrapper>,
    )

    const ticketsLink = await screen.findByRole("link", { name: /ops tickets/i })
    expect(ticketsLink).toHaveAttribute("aria-current", "page")
  })

  it("should highlight admin portal as active on /admin path", async () => {
    render(
      <TestWrapper initialPath="/admin">
        <AppMainNav />
      </TestWrapper>,
    )

    const adminLink = await screen.findByRole("link", { name: /admin portal/i })
    expect(adminLink).toHaveAttribute("aria-current", "page")
  })
})
