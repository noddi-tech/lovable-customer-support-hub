import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { fireEvent, render, screen, waitFor } from "@testing-library/react"
import { beforeEach, describe, expect, vi } from "vitest"
import { useThreadMessagesList } from "@/hooks/conversations/useThreadMessagesList"
import { createNormalizationContext, normalizeMessage } from "@/lib/normalizeMessage"
import { ProgressiveMessagesList } from "../ProgressiveMessagesList"

// Mock dependencies
vi.mock("@/hooks/conversations/useThreadMessagesList")
vi.mock("@/contexts/ConversationViewContext", () => ({
  useConversationView: () => ({
    state: { showReplyArea: false },
    dispatch: vi.fn(),
    sendDraft: vi.fn(),
    editDraft: vi.fn(),
    dismissDraft: vi.fn(),
  }),
}))

// jsdom does not implement Element.scrollTo; the scroll area calls it on load.
Element.prototype.scrollTo = vi.fn()
vi.mock("@/hooks/useDateFormatting", () => ({
  useDateFormatting: () => ({
    formatShortDateTime: (date: string) => new Date(date).toLocaleString(),
    dateTime: (date: string) => new Date(date).toLocaleString(),
  }),
}))
vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}))

const createTestQueryClient = () =>
  new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  })

// Test data
const rawMockMessages = [
  {
    id: "msg-1",
    content: "First message content",
    content_type: "text/plain",
    sender_type: "customer" as const,
    sender_id: "customer1",
    is_internal: false,
    attachments: null,
    created_at: "2024-01-01T10:00:00Z",
  },
  {
    id: "msg-2",
    content: "Second message content",
    content_type: "text/plain",
    sender_type: "agent" as const,
    sender_id: "agent1",
    is_internal: false,
    attachments: null,
    created_at: "2024-01-01T11:00:00Z",
  },
  {
    id: "msg-3",
    content: "Third message content",
    content_type: "text/plain",
    sender_type: "customer" as const,
    sender_id: "customer1",
    is_internal: false,
    attachments: null,
    created_at: "2024-01-01T12:00:00Z",
  },
]

const testNormalizationContext = createNormalizationContext({
  currentUserEmail: "agent@test.com",
  agentEmails: ["agent@test.com"],
})

const mockMessages = rawMockMessages.map((msg) => normalizeMessage(msg, testNormalizationContext))
const mockConversation = { id: "test-conversation", subject: "Test Subject" }

describe("ProgressiveMessagesList", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  test("renders only newest messages initially", async () => {
    const mockUseThreadMessagesList = vi.mocked(useThreadMessagesList)
    mockUseThreadMessagesList.mockReturnValue({
      messages: mockMessages,
      totalCount: 10,
      loadedCount: 3,
      estimatedNormalized: 10,
      remaining: 7,
      confidence: "high" as const,
      hasNextPage: true,
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
      expect(screen.getByText("Load older messages (7 remaining)")).toBeInTheDocument()
    })

    // Check that messages are rendered
    expect(screen.getByText(/First message content/)).toBeInTheDocument()
    expect(screen.getByText(/Second message content/)).toBeInTheDocument()
    expect(screen.getByText(/Third message content/)).toBeInTheDocument()
  })

  test("shows load older messages button when more messages available", async () => {
    const mockUseThreadMessagesList = vi.mocked(useThreadMessagesList)
    mockUseThreadMessagesList.mockReturnValue({
      messages: mockMessages,
      totalCount: 15,
      loadedCount: 3,
      estimatedNormalized: 15,
      remaining: 12,
      confidence: "high" as const,
      hasNextPage: true,
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

    const loadButton = await screen.findByText("Load older messages (12 remaining)")
    expect(loadButton).toBeInTheDocument()
    expect(loadButton).toBeEnabled()
  })

  test("clicking load older messages calls fetchNextPage", async () => {
    const mockFetchNextPage = vi.fn().mockResolvedValue({})
    const mockUseThreadMessagesList = vi.mocked(useThreadMessagesList)
    mockUseThreadMessagesList.mockReturnValue({
      messages: mockMessages,
      totalCount: 15,
      loadedCount: 3,
      estimatedNormalized: 15,
      remaining: 12,
      confidence: "high" as const,
      hasNextPage: true,
      isFetchingNextPage: false,
      fetchNextPage: mockFetchNextPage,
      isLoading: false,
      error: null,
    })

    render(
      <QueryClientProvider client={createTestQueryClient()}>
        <ProgressiveMessagesList conversationId="test-conv" conversation={mockConversation} />
      </QueryClientProvider>,
    )

    const loadButton = await screen.findByText("Load older messages (12 remaining)")
    fireEvent.click(loadButton)

    expect(mockFetchNextPage).toHaveBeenCalled()
  })

  test("shows loading state while fetching next page", async () => {
    const mockUseThreadMessagesList = vi.mocked(useThreadMessagesList)
    mockUseThreadMessagesList.mockReturnValue({
      messages: mockMessages,
      totalCount: 15,
      loadedCount: 3,
      estimatedNormalized: 15,
      remaining: 12,
      confidence: "high" as const,
      hasNextPage: true,
      isFetchingNextPage: true,
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
      expect(screen.getByText("Loading older messages...")).toBeInTheDocument()
      const loadButton = screen.getByRole("button", { name: /Loading older messages/ })
      expect(loadButton).toBeDisabled()
    })
  })

  test("shows no messages state when conversation is empty", async () => {
    const mockUseThreadMessagesList = vi.mocked(useThreadMessagesList)
    mockUseThreadMessagesList.mockReturnValue({
      messages: [],
      totalCount: 0,
      loadedCount: 0,
      estimatedNormalized: 0,
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
      expect(screen.getByText("conversation.noMessages")).toBeInTheDocument()
    })
  })

  test("does not show load button when no more pages", async () => {
    const mockUseThreadMessagesList = vi.mocked(useThreadMessagesList)
    mockUseThreadMessagesList.mockReturnValue({
      messages: mockMessages,
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
      expect(screen.queryByText(/Load older messages/)).not.toBeInTheDocument()
    })
  })
})
