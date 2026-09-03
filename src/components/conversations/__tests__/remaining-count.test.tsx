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

describe("ProgressiveMessagesList - Remaining Count", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("shows accurate remaining count with high confidence", async () => {
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
      totalCount: 10,
      loadedCount: 1,
      remaining: 9,
      estimatedNormalized: 10,
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
      expect(screen.getByText("Load older messages (9 remaining)")).toBeInTheDocument()
    })
  })

  it("hides count with low confidence", async () => {
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
      totalCount: 3322,
      loadedCount: 1,
      remaining: 0,
      estimatedNormalized: 3322,
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
      expect(screen.queryByText(/remaining/)).not.toBeInTheDocument()
    })
  })

  it("hides count when remaining > 500", async () => {
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
      loadedCount: 1,
      remaining: 0,
      estimatedNormalized: 1000,
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
      expect(screen.queryByText(/999 remaining/)).not.toBeInTheDocument()
    })
  })

  it("hides load button when no more pages", async () => {
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
