import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { render, screen } from "@testing-library/react"
import type { ReactNode } from "react"
import { beforeEach, describe, expect, it, vi } from "vitest"
import type { ConversationPriority, ConversationStatus } from "@/contexts/ConversationListContext"
import { createMockConversation } from "@/test/test-utils"
import { ConversationListItem } from "../conversation-list/ConversationListItem"

// The component pulls data-formatting and count hooks that use React Query.
const renderWithClient = (ui: ReactNode) => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  })
  return render(<QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>)
}

// Presence avatars depend on AuthContext + realtime; not relevant to these assertions.
vi.mock("@/components/conversations/PresenceAvatarStack", () => ({
  PresenceAvatarStack: () => null,
}))

// Mock the context hook
const mockDispatch = vi.fn()
const mockArchiveConversation = vi.fn()

vi.mock("@/contexts/ConversationListContext", async () => {
  const actual = await vi.importActual("@/contexts/ConversationListContext")
  return {
    ...actual,
    useConversationList: () => ({
      dispatch: mockDispatch,
      archiveConversation: mockArchiveConversation,
    }),
  }
})

describe("ConversationListItem", () => {
  const mockConversation = createMockConversation({
    status: "open" as ConversationStatus,
    priority: "normal" as ConversationPriority,
    is_read: false,
  })

  const defaultProps = {
    conversation: mockConversation,
    isSelected: false,
    onSelect: vi.fn(),
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("renders conversation information correctly", () => {
    renderWithClient(<ConversationListItem {...defaultProps} />)

    expect(screen.getByText("Test Conversation")).toBeDefined()
    // The list item shows the customer's display name (not the raw email).
    expect(screen.getByText("John Doe")).toBeDefined()
    expect(screen.queryByText("john@example.com")).toBeNull()
  })

  it("displays status and priority badges", () => {
    renderWithClient(<ConversationListItem {...defaultProps} />)

    expect(screen.getByText("open")).toBeDefined()
    expect(screen.getByText("normal")).toBeDefined()
  })
})
