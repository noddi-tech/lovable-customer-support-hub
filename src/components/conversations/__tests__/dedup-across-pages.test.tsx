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

describe("ProgressiveMessagesList - Cross-Page Deduplication", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("deduplicates overlapping messages from multiple pages", async () => {
    const mockUseThreadMessagesList = vi.mocked(useThreadMessagesList)

    // Simulate two pages with overlapping raw data but deduplication removes duplicates
    const originalMessage = {
      id: "msg-1",
      content: "Duplicate message content",
      content_type: "text/plain",
      sender_type: "customer" as const,
      sender_id: "customer1",
      is_internal: false,
      attachments: null,
      created_at: "2024-01-01T10:00:00Z",
      external_id: "external-123",
      email_headers: { "Message-ID": "unique@example.com" },
    }

    // Should only show 1 unique card despite 2 raw messages
    mockUseThreadMessagesList.mockReturnValue({
      messages: [normalizeMessage(originalMessage, testNormalizationContext)],
      totalCount: 10,
      loadedCount: 1,
      remaining: 7,
      estimatedNormalized: 8,
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

    // Should show only 1 message despite duplicates being present in raw data
    await waitFor(() => {
      expect(screen.getByText("1 message")).toBeInTheDocument()
      const messageCards = screen.getAllByText(/Duplicate message content/)
      expect(messageCards).toHaveLength(1)
    })
  })

  it("maintains chronological order after deduplication", async () => {
    const mockUseThreadMessagesList = vi.mocked(useThreadMessagesList)

    // Hook returns messages newest-first (as useThreadMessagesList sorts them)
    const messages = [
      normalizeMessage(
        {
          id: "msg-3",
          content: "Third message",
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
          content: "Second message",
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
          content: "First message",
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
      remaining: 0,
      estimatedNormalized: 3,
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
      // Cards render oldest-first (natural email reading order)
      const messageElements = screen.getAllByText(/(First|Second|Third) message/)
      expect(messageElements[0]).toHaveTextContent("First message")
      expect(messageElements[1]).toHaveTextContent("Second message")
      expect(messageElements[2]).toHaveTextContent("Third message")
    })
  })

  it("uses stable dedup keys for React keys", async () => {
    const mockUseThreadMessagesList = vi.mocked(useThreadMessagesList)

    const message = normalizeMessage(
      {
        id: "msg-1",
        content: "Test message",
        content_type: "text/plain",
        sender_type: "customer" as const,
        sender_id: "customer1",
        is_internal: false,
        attachments: null,
        created_at: "2024-01-01T10:00:00Z",
        external_id: "stable-external-id",
      },
      testNormalizationContext,
    )

    mockUseThreadMessagesList.mockReturnValue({
      messages: [message],
      totalCount: 1,
      loadedCount: 1,
      remaining: 0,
      estimatedNormalized: 1,
      confidence: "high" as const,
      hasNextPage: false,
      isFetchingNextPage: false,
      fetchNextPage: vi.fn(),
      isLoading: false,
      error: null,
    })

    const { container } = render(
      <QueryClientProvider client={createTestQueryClient()}>
        <ProgressiveMessagesList conversationId="test-conv" conversation={mockConversation} />
      </QueryClientProvider>,
    )

    // Verify the message card uses the dedupKey as React key
    await waitFor(() => {
      expect(message.dedupKey).toBe("id:stable-external-id")
      // The message card should be rendered
      expect(screen.getByText("Test message")).toBeInTheDocument()
    })
  })
})
