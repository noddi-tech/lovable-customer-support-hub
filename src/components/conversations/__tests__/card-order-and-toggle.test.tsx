import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { fireEvent, render, screen, waitFor } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { useThreadMessagesList } from "@/hooks/conversations/useThreadMessagesList"
import { createNormalizationContext, normalizeMessage } from "@/lib/normalizeMessage"
import { ProgressiveMessagesList } from "../ProgressiveMessagesList"

// Mock dependencies
vi.mock("@/hooks/conversations/useThreadMessagesList")
vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}))
vi.mock("@/hooks/useDateFormatting", () => ({
  useDateFormatting: () => ({
    dateTime: (date: string) => new Date(date).toLocaleString(),
  }),
}))
vi.mock("@/contexts/ConversationViewContext", () => ({
  useConversationView: () => ({
    state: { showReplyArea: false },
    dispatch: vi.fn(),
    sendDraft: vi.fn(),
    editDraft: vi.fn(),
    dismissDraft: vi.fn(),
  }),
}))

// jsdom does not implement Element.prototype.scrollTo (used by the auto-scroll effect)
if (!Element.prototype.scrollTo) {
  Element.prototype.scrollTo = vi.fn()
}

const createTestQueryClient = () =>
  new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  })

const mockConversation = { id: "test-conversation", subject: "Test Subject" }
const testNormalizationContext = createNormalizationContext({
  currentUserEmail: "agent@test.com",
  agentEmails: ["agent@test.com"],
})

describe("ProgressiveMessagesList - Card Order and Toggle", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("displays newest messages first by default", async () => {
    const mockUseThreadMessagesList = vi.mocked(useThreadMessagesList)

    const messages = [
      normalizeMessage(
        {
          id: "msg-3",
          content: "Newest message",
          content_type: "text/plain",
          sender_type: "customer" as const,
          sender_id: "customer1",
          is_internal: false,
          attachments: null,
          created_at: "2024-01-01T12:00:00Z",
        },
        testNormalizationContext,
      ),
      normalizeMessage(
        {
          id: "msg-2",
          content: "Middle message",
          content_type: "text/plain",
          sender_type: "customer" as const,
          sender_id: "customer1",
          is_internal: false,
          attachments: null,
          created_at: "2024-01-01T11:00:00Z",
        },
        testNormalizationContext,
      ),
      normalizeMessage(
        {
          id: "msg-1",
          content: "Oldest message",
          content_type: "text/plain",
          sender_type: "customer" as const,
          sender_id: "customer1",
          is_internal: false,
          attachments: null,
          created_at: "2024-01-01T10:00:00Z",
        },
        testNormalizationContext,
      ),
    ]

    mockUseThreadMessagesList.mockReturnValue({
      messages,
      totalCount: 3,
      loadedCount: 3,
      estimatedNormalized: 3,
      remaining: 0,
      confidence: "high" as const,
      hasNextPage: false,
      isFetchingNextPage: false,
      fetchNextPage: vi.fn(),
      isLoading: false,
      error: null,
    })

    render(
      <QueryClientProvider client={createTestQueryClient()}>
        <ProgressiveMessagesList conversationId="test-conv" conversation={mockConversation} />
      </QueryClientProvider>,
    )

    await waitFor(() => {
      expect(screen.getByText("Newest message")).toBeInTheDocument()
    })

    // Continuous chat-style thread renders oldest at top, newest at bottom
    const oldest = screen.getByText("Oldest message")
    const middle = screen.getByText("Middle message")
    const newest = screen.getByText("Newest message")
    expect(oldest.compareDocumentPosition(middle) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    expect(middle.compareDocumentPosition(newest) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
  })

  it("renders all messages expanded in the continuous thread", async () => {
    const mockUseThreadMessagesList = vi.mocked(useThreadMessagesList)

    const messages = [
      normalizeMessage(
        {
          id: "msg-1",
          content:
            "This is a long message that should show preview when collapsed and full content when expanded. It contains multiple sentences to test the preview functionality.",
          content_type: "text/plain",
          sender_type: "customer" as const,
          sender_id: "customer1",
          is_internal: false,
          attachments: null,
          created_at: "2024-01-01T10:00:00Z",
        },
        testNormalizationContext,
      ),
    ]

    mockUseThreadMessagesList.mockReturnValue({
      messages,
      totalCount: 1,
      loadedCount: 1,
      estimatedNormalized: 1,
      remaining: 0,
      confidence: "high" as const,
      hasNextPage: false,
      isFetchingNextPage: false,
      fetchNextPage: vi.fn(),
      isLoading: false,
      error: null,
    })

    render(
      <QueryClientProvider client={createTestQueryClient()}>
        <ProgressiveMessagesList conversationId="test-conv" conversation={mockConversation} />
      </QueryClientProvider>,
    )

    await waitFor(() => {
      expect(
        screen.getByText(/This is a long message that should show preview when collapsed/),
      ).toBeInTheDocument()
    })

    // Continuous thread auto-expands cards, so the full content is shown
    expect(screen.getByText(/It contains multiple sentences/)).toBeInTheDocument()
  })

  it("renders every message's full content in the continuous thread", async () => {
    const mockUseThreadMessagesList = vi.mocked(useThreadMessagesList)

    const messages = [
      normalizeMessage(
        {
          id: "msg-1",
          content: "Message 1 with full content to test expand/collapse",
          content_type: "text/plain",
          sender_type: "customer" as const,
          sender_id: "customer1",
          is_internal: false,
          attachments: null,
          created_at: "2024-01-01T10:00:00Z",
        },
        testNormalizationContext,
      ),
      normalizeMessage(
        {
          id: "msg-2",
          content: "Message 2 with full content to test expand/collapse",
          content_type: "text/plain",
          sender_type: "customer" as const,
          sender_id: "customer1",
          is_internal: false,
          attachments: null,
          created_at: "2024-01-01T11:00:00Z",
        },
        testNormalizationContext,
      ),
    ]

    mockUseThreadMessagesList.mockReturnValue({
      messages,
      totalCount: 2,
      loadedCount: 2,
      estimatedNormalized: 2,
      remaining: 0,
      confidence: "high" as const,
      hasNextPage: false,
      isFetchingNextPage: false,
      fetchNextPage: vi.fn(),
      isLoading: false,
      error: null,
    })

    render(
      <QueryClientProvider client={createTestQueryClient()}>
        <ProgressiveMessagesList conversationId="test-conv" conversation={mockConversation} />
      </QueryClientProvider>,
    )

    // Continuous thread renders every loaded turn expanded with full content
    await waitFor(() => {
      expect(
        screen.getByText("Message 1 with full content to test expand/collapse"),
      ).toBeInTheDocument()
      expect(
        screen.getByText("Message 2 with full content to test expand/collapse"),
      ).toBeInTheDocument()
    })
  })

  it("displays correct sender attribution", async () => {
    const mockUseThreadMessagesList = vi.mocked(useThreadMessagesList)

    const messages = [
      normalizeMessage(
        {
          id: "msg-1",
          content: "Customer message",
          content_type: "text/plain",
          sender_type: "customer" as const,
          sender_id: "customer1",
          is_internal: false,
          attachments: null,
          created_at: "2024-01-01T10:00:00Z",
          email_headers: { from: "customer@example.com" },
        },
        testNormalizationContext,
      ),
      normalizeMessage(
        {
          id: "msg-2",
          content: "Agent message",
          content_type: "text/plain",
          sender_type: "agent" as const,
          sender_id: "agent1",
          is_internal: false,
          attachments: null,
          created_at: "2024-01-01T11:00:00Z",
          email_headers: { from: "agent@test.com" },
        },
        testNormalizationContext,
      ),
    ]

    mockUseThreadMessagesList.mockReturnValue({
      messages,
      totalCount: 2,
      loadedCount: 2,
      estimatedNormalized: 2,
      remaining: 0,
      confidence: "high" as const,
      hasNextPage: false,
      isFetchingNextPage: false,
      fetchNextPage: vi.fn(),
      isLoading: false,
      error: null,
    })

    render(
      <QueryClientProvider client={createTestQueryClient()}>
        <ProgressiveMessagesList conversationId="test-conv" conversation={mockConversation} />
      </QueryClientProvider>,
    )

    // Card header shows the sender's short name (email local part) as attribution
    await waitFor(() => {
      expect(screen.getByText("customer")).toBeInTheDocument()
    })
    expect(screen.getByText("agent")).toBeInTheDocument()

    // Full email is preserved on the card's accessible label
    expect(screen.getByLabelText(/from customer@example\.com/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/from agent@test\.com/i)).toBeInTheDocument()
  })

  it("shows quoted history toggle when available", async () => {
    const mockUseThreadMessagesList = vi.mocked(useThreadMessagesList)

    // Create a message with quoted content
    const messageWithQuotes = normalizeMessage(
      {
        id: "msg-1",
        content:
          "New reply\n\nOn Mon, Jan 1, 2024 at 10:00 AM, customer@example.com wrote:\n> Previous message content\n> This was in the original email",
        content_type: "text/plain",
        sender_type: "customer" as const,
        sender_id: "customer1",
        is_internal: false,
        attachments: null,
        created_at: "2024-01-01T10:00:00Z",
      },
      testNormalizationContext,
    )

    mockUseThreadMessagesList.mockReturnValue({
      messages: [messageWithQuotes],
      totalCount: 1,
      loadedCount: 1,
      estimatedNormalized: 1,
      remaining: 0,
      confidence: "high" as const,
      hasNextPage: false,
      isFetchingNextPage: false,
      fetchNextPage: vi.fn(),
      isLoading: false,
      error: null,
    })

    render(
      <QueryClientProvider client={createTestQueryClient()}>
        <ProgressiveMessagesList conversationId="test-conv" conversation={mockConversation} />
      </QueryClientProvider>,
    )

    expect(messageWithQuotes.quotedBlocks?.length ?? 0).toBeGreaterThan(0)

    // Cards are auto-expanded in the continuous thread, so the toggle is visible directly
    await waitFor(() => {
      expect(screen.getByText(/Show trimmed content/)).toBeInTheDocument()
    })

    fireEvent.click(screen.getByText(/Show trimmed content/))

    await waitFor(() => {
      expect(screen.getByText(/Hide trimmed content/)).toBeInTheDocument()
    })
  })
})
