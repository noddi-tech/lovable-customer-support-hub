import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { render, screen } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { BrowserRouter } from "@/router/compat"
import { EnhancedInteractionsLayout } from "../EnhancedInteractionsLayout"

// Mock the hooks and components
vi.mock("@/hooks/use-responsive", () => ({
  useIsMobile: () => false,
}))

vi.mock("@/hooks/useInteractionsNavigation", () => ({
  useInteractionsNavigation: () => ({
    currentState: {
      conversationId: "test-conversation-id",
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
  useThread: () => ({
    data: {
      subject: "Test Thread",
      customer: { full_name: "Test Customer", email: "test@example.com" },
    },
    isLoading: false,
  }),
  useReply: () => ({ mutateAsync: vi.fn(), isPending: false }),
}))

vi.mock("../ConversationView", () => ({
  ConversationView: ({ conversationId }: { conversationId: string }) => (
    <div data-testid="conversation-view">{conversationId}</div>
  ),
}))

vi.mock("@/components/admin/design/components/detail/ReplySidebar", () => ({
  ReplySidebar: (props: any) => <div data-testid="reply-sidebar">Reply Sidebar</div>,
}))

vi.mock("@/components/layout/InboxList", () => ({
  InboxList: () => <div data-testid="inbox-list">Inbox List</div>,
}))

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string, defaultValue?: string) => defaultValue || key,
  }),
}))

const TestWrapper = ({ children }: { children: React.ReactNode }) => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  })

  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>{children}</BrowserRouter>
    </QueryClientProvider>
  )
}

describe("EnhancedInteractionsLayout", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("renders a single thread pane in detail mode", async () => {
    render(
      <TestWrapper>
        <EnhancedInteractionsLayout
          activeSubTab="conversations"
          selectedTab="interactions"
          onTabChange={vi.fn()}
          selectedInboxId="test-inbox"
        />
      </TestWrapper>,
    )

    // Router (TanStack) resolves asynchronously, so await the detail grid.
    const grid = await screen.findByTestId("detail-grid")
    expect(grid).toBeInTheDocument()
    // Single-rail layout: only the message-thread pane (reply lives inside the thread view).
    // eslint-disable-next-line testing-library/no-node-access -- assert single pane child
    expect(grid.childElementCount).toBe(1)
  })

  it("does not have width clamps in the detail subtree", async () => {
    render(
      <TestWrapper>
        <EnhancedInteractionsLayout
          activeSubTab="conversations"
          selectedTab="interactions"
          onTabChange={vi.fn()}
          selectedInboxId="test-inbox"
        />
      </TestWrapper>,
    )

    const grid = await screen.findByTestId("detail-grid")
    // eslint-disable-next-line testing-library/no-node-access -- layout guard scans subtree classNames
    const allElements = grid.querySelectorAll("*")

    allElements.forEach((element) => {
      const className = element.className?.toString() || ""
      // `max-w-none` is an explicit anti-clamp and is allowed.
      expect(className).not.toMatch(/\b(container|mx-auto)\b|\bmax-w-(?!none)/)
    })
  })

  it("detail grid has a single pane with no inner horizontal padding", async () => {
    render(
      <TestWrapper>
        <EnhancedInteractionsLayout
          activeSubTab="conversations"
          selectedTab="interactions"
          onTabChange={vi.fn()}
          selectedInboxId="test-inbox"
        />
      </TestWrapper>,
    )

    const grid = await screen.findByTestId("detail-grid")
    // eslint-disable-next-line testing-library/no-node-access -- assert single pane child
    expect(grid.childElementCount).toBe(1) // thread only (single rail)

    // Direct grid children must not carry horizontal padding classes.
    // eslint-disable-next-line testing-library/no-node-access -- padding checked on direct grid children
    Array.from(grid.children).forEach((child) => {
      const className = (child as HTMLElement).className?.toString() || ""
      expect(className).not.toMatch(/\bp[xlr]-[1-9]/)
    })
  })
})
