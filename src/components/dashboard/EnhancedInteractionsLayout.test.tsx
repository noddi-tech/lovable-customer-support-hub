import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { render, screen } from "@testing-library/react"
import type { ReactNode } from "react"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { BrowserRouter } from "@/router/compat"
import { EnhancedInteractionsLayout } from "./EnhancedInteractionsLayout"

// Mock navigation in list mode (no conversation selected).
vi.mock("@/hooks/useInteractionsNavigation", () => ({
  useInteractionsNavigation: () => ({
    currentState: {
      conversationId: null,
      inbox: "test-inbox",
      status: "all",
      search: "",
    },
    setInbox: vi.fn(),
    setStatus: vi.fn(),
    setSearch: vi.fn(),
    openConversation: vi.fn(),
    backToList: vi.fn(),
  }),
}))

vi.mock("@/hooks/useInteractionsData", () => ({
  useAccessibleInboxes: () => ({ data: [{ id: "test-inbox", name: "Test Inbox" }] }),
  useConversations: () => ({ data: [], isLoading: false }),
  useThread: () => ({ data: null, isLoading: false }),
  useReply: () => ({ mutateAsync: vi.fn(), isPending: false }),
}))

vi.mock("@/hooks/use-responsive", () => ({
  useIsMobile: () => false,
}))

// Heavy children are exercised by their own tests; here we assert the layout shell.
vi.mock("@/components/layout/InboxList", () => ({
  InboxList: () => <div data-testid="inbox-list">Inbox List</div>,
}))

vi.mock("./ConversationList", () => ({
  ConversationList: () => <div data-testid="conversation-list">Conversation List</div>,
}))

vi.mock("./shared/ChannelPageHeader", () => ({
  ChannelPageHeader: ({ title }: { title: string }) => (
    <div data-testid="channel-page-header">{title}</div>
  ),
}))

vi.mock("./InboxMetricsDialog", () => ({
  InboxMetricsDialog: () => null,
}))

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  })

  return ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>{children}</BrowserRouter>
    </QueryClientProvider>
  )
}

describe("EnhancedInteractionsLayout", () => {
  const defaultProps = {
    activeSubTab: "all",
    selectedTab: "all",
    onTabChange: vi.fn(),
    selectedInboxId: "test-inbox",
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("renders the two-pane list layout (inbox rail + conversation list)", async () => {
    render(<EnhancedInteractionsLayout {...defaultProps} />, { wrapper: createWrapper() })

    // Router (TanStack) resolves asynchronously, so await the list grid.
    const grid = await screen.findByTestId("list-grid")
    expect(grid).toBeInTheDocument()
    // eslint-disable-next-line testing-library/no-node-access -- two resizable panes + a drag handle between them
    expect(grid.childElementCount).toBe(3)
  })

  it("renders the inbox rail and conversation list", async () => {
    render(<EnhancedInteractionsLayout {...defaultProps} />, { wrapper: createWrapper() })

    expect(await screen.findByTestId("inbox-list")).toBeInTheDocument()
    expect(screen.getByTestId("conversation-list")).toBeInTheDocument()
  })

  it("renders the search input", async () => {
    render(<EnhancedInteractionsLayout {...defaultProps} />, { wrapper: createWrapper() })

    const searchInput = await screen.findByPlaceholderText("Search conversations...")
    expect(searchInput).toBeInTheDocument()
  })

  it("does not have width clamps in the list subtree", async () => {
    render(<EnhancedInteractionsLayout {...defaultProps} />, { wrapper: createWrapper() })

    const grid = await screen.findByTestId("list-grid")
    // eslint-disable-next-line testing-library/no-node-access -- layout guard scans subtree classNames
    const allElements = grid.querySelectorAll("*")

    allElements.forEach((element) => {
      const className = element.className?.toString() || ""
      // `max-w-none` is an explicit anti-clamp and is allowed.
      expect(className).not.toMatch(/\b(container|mx-auto)\b|\bmax-w-(?!none)/)
    })
  })
})
