import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { render, screen, waitFor } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"
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
vi.mock("@/hooks/useDateFormatting", () => ({
  useDateFormatting: () => ({
    dateTime: (date: string) => new Date(date).toLocaleString(),
    formatShortDateTime: (date: string) => new Date(date).toLocaleString(),
  }),
}))
vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}))

// jsdom does not implement Element.scrollTo; the scroll area calls it on load.
Element.prototype.scrollTo = vi.fn()

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

describe("ProgressiveMessagesList - Remaining Count Confidence", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("shows count with high confidence and low remaining", async () => {
    const mockUseThreadMessagesList = vi.mocked(useThreadMessagesList)
    mockUseThreadMessagesList.mockReturnValue({
      messages: [
        normalizeMessage(
          {
            id: "1",
            content: "Message 1",
            content_type: "text/plain",
            sender_type: "customer",
            sender_id: "customer1",
            is_internal: false,
            attachments: null,
            created_at: "2024-01-01T10:00:00Z",
          },
          testNormalizationContext,
        ),
      ],
      totalCount: 15,
      loadedCount: 5,
      remaining: 10,
      estimatedNormalized: 15,
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
      expect(screen.getByText("Load older messages (10 remaining)")).toBeInTheDocument()
    })
  })

  it("hides count with high confidence but high remaining (>500)", async () => {
    const mockUseThreadMessagesList = vi.mocked(useThreadMessagesList)
    mockUseThreadMessagesList.mockReturnValue({
      messages: [
        normalizeMessage(
          {
            id: "1",
            content: "Message 1",
            content_type: "text/plain",
            sender_type: "customer",
            sender_id: "customer1",
            is_internal: false,
            attachments: null,
            created_at: "2024-01-01T10:00:00Z",
          },
          testNormalizationContext,
        ),
      ],
      totalCount: 1000,
      loadedCount: 3,
      remaining: 0,
      estimatedNormalized: 800,
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
      expect(screen.getByText("Load older messages")).toBeInTheDocument()
      expect(screen.queryByText(/797 remaining/)).not.toBeInTheDocument()
    })
  })

  it("hides count with low confidence regardless of count", async () => {
    const mockUseThreadMessagesList = vi.mocked(useThreadMessagesList)
    mockUseThreadMessagesList.mockReturnValue({
      messages: [
        normalizeMessage(
          {
            id: "1",
            content: "Message 1",
            content_type: "text/plain",
            sender_type: "customer",
            sender_id: "customer1",
            is_internal: false,
            attachments: null,
            created_at: "2024-01-01T10:00:00Z",
          },
          testNormalizationContext,
        ),
      ],
      totalCount: 100,
      loadedCount: 3,
      remaining: 0,
      estimatedNormalized: 50,
      confidence: "low" as const,
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
      expect(screen.getByText("Load older messages")).toBeInTheDocument()
      expect(screen.queryByText(/47 remaining/)).not.toBeInTheDocument()
    })
  })

  it("shows zero remaining correctly", async () => {
    const mockUseThreadMessagesList = vi.mocked(useThreadMessagesList)
    mockUseThreadMessagesList.mockReturnValue({
      messages: [
        normalizeMessage(
          {
            id: "1",
            content: "Message 1",
            content_type: "text/plain",
            sender_type: "customer",
            sender_id: "customer1",
            is_internal: false,
            attachments: null,
            created_at: "2024-01-01T10:00:00Z",
          },
          testNormalizationContext,
        ),
      ],
      totalCount: 5,
      loadedCount: 5,
      remaining: 0,
      estimatedNormalized: 5,
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
      // Should not show load button when hasNextPage is false
      expect(screen.queryByText(/Load older messages/)).not.toBeInTheDocument()
    })
  })

  it("handles edge case with no estimated count", async () => {
    const mockUseThreadMessagesList = vi.mocked(useThreadMessagesList)
    mockUseThreadMessagesList.mockReturnValue({
      messages: [
        normalizeMessage(
          {
            id: "1",
            content: "Message 1",
            content_type: "text/plain",
            sender_type: "customer",
            sender_id: "customer1",
            is_internal: false,
            attachments: null,
            created_at: "2024-01-01T10:00:00Z",
          },
          testNormalizationContext,
        ),
      ],
      totalCount: 0,
      loadedCount: 1,
      remaining: 0,
      estimatedNormalized: 0,
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
      expect(screen.getByText("Load older messages")).toBeInTheDocument()
      expect(screen.queryByText(/remaining/)).not.toBeInTheDocument()
    })
  })

  it("confidence calculation reflects normalization quality", async () => {
    const mockUseThreadMessagesList = vi.mocked(useThreadMessagesList)

    // Test high confidence scenario (good normalization ratio)
    mockUseThreadMessagesList.mockReturnValue({
      messages: [
        normalizeMessage(
          {
            id: "1",
            content: "Message 1",
            content_type: "text/plain",
            sender_type: "customer",
            sender_id: "customer1",
            is_internal: false,
            attachments: null,
            created_at: "2024-01-01T10:00:00Z",
          },
          testNormalizationContext,
        ),
      ],
      totalCount: 100,
      loadedCount: 20,
      remaining: 70,
      estimatedNormalized: 90, // Good ratio: 90/100 = 0.9
      confidence: "high" as const,
      hasNextPage: true,
      isFetchingNextPage: false,
      fetchNextPage: vi.fn(),
      isLoading: false,
      error: null,
    })

    const { rerender } = render(
      <QueryClientProvider client={createTestQueryClient()}>
        <ProgressiveMessagesList conversationId="test-conv" conversation={mockConversation} />
      </QueryClientProvider>,
    )

    await waitFor(() => {
      expect(screen.getByText("Load older messages (70 remaining)")).toBeInTheDocument()
    })

    // Test low confidence scenario (poor normalization ratio)
    mockUseThreadMessagesList.mockReturnValue({
      messages: [
        normalizeMessage(
          {
            id: "1",
            content: "Message 1",
            content_type: "text/plain",
            sender_type: "customer",
            sender_id: "customer1",
            is_internal: false,
            attachments: null,
            created_at: "2024-01-01T10:00:00Z",
          },
          testNormalizationContext,
        ),
      ],
      totalCount: 100,
      loadedCount: 20,
      remaining: 0,
      estimatedNormalized: 25, // Poor ratio: 25/100 = 0.25
      confidence: "low" as const,
      hasNextPage: true,
      isFetchingNextPage: false,
      fetchNextPage: vi.fn(),
      isLoading: false,
      error: null,
    })

    rerender(
      <QueryClientProvider client={createTestQueryClient()}>
        <ProgressiveMessagesList conversationId="test-conv" conversation={mockConversation} />
      </QueryClientProvider>,
    )

    await waitFor(() => {
      expect(screen.getByText("Load older messages")).toBeInTheDocument()
      expect(screen.queryByText(/remaining/)).not.toBeInTheDocument()
    })
  })
})
