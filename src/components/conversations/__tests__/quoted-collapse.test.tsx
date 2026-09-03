import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { fireEvent, render, screen } from "@testing-library/react"
import { describe, expect, test, vi } from "vitest"
import { createNormalizationContext, normalizeMessage } from "@/lib/normalizeMessage"
import { MessageItem } from "../MessageItem"

// Mock the hooks and utilities
vi.mock("@/hooks/useDateFormatting", () => ({
  useDateFormatting: () => ({
    dateTime: (date: string) => new Date(date).toLocaleDateString(),
  }),
}))

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}))

vi.mock("@/components/ui/email-render", () => ({
  EmailRender: ({ content }: { content: string }) => (
    <div data-testid="email-content">{content}</div>
  ),
}))

const createTestQueryClient = () =>
  new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  })

const mockConversation = {
  customer: {
    full_name: "Test Customer",
    email: "test@example.com",
  },
}

// Create normalization context for tests
const testNormalizationContext = createNormalizationContext({
  agentEmails: ["agent@test.com"],
  currentUserEmail: "agent@test.com",
})

describe("MessageItem - Quoted Text Collapse", () => {
  test("shows toggle for messages with quoted content", async () => {
    const rawMessage = {
      id: "1",
      content:
        "This is my reply.\n\nOn 2024-01-01, Original Sender wrote:\n> This is the original message\n> that was quoted",
      content_type: "text/plain",
      sender_type: "customer" as const,
      sender_id: "customer1",
      is_internal: false,
      attachments: null,
      created_at: "2024-01-01T10:00:00Z",
    }

    const normalizedMessage = normalizeMessage(rawMessage, testNormalizationContext)
    const queryClient = createTestQueryClient()

    render(
      <QueryClientProvider client={queryClient}>
        <MessageItem message={normalizedMessage} conversation={mockConversation} />
      </QueryClientProvider>,
    )

    // Should show the toggle button for quoted text
    const toggleButton = screen.getByRole("button", { name: /conversation\.showQuoted/i })
    expect(toggleButton).toBeInTheDocument()
  })

  test("does not show toggle for messages without quoted content", async () => {
    const rawMessage = {
      id: "1",
      content: "This is just a regular message without any quotes.",
      content_type: "text/plain",
      sender_type: "customer" as const,
      sender_id: "customer1",
      is_internal: false,
      attachments: null,
      created_at: "2024-01-01T10:00:00Z",
    }

    const normalizedMessage = normalizeMessage(rawMessage, testNormalizationContext)
    const queryClient = createTestQueryClient()

    render(
      <QueryClientProvider client={queryClient}>
        <MessageItem message={normalizedMessage} conversation={mockConversation} />
      </QueryClientProvider>,
    )

    // Should not show the toggle button
    expect(
      screen.queryByRole("button", { name: /conversation\.showQuoted/i }),
    ).not.toBeInTheDocument()
  })

  test("toggle shows and hides quoted content", async () => {
    const rawMessage = {
      id: "1",
      content:
        "This is my reply.\n\nOn 2024-01-01, Original Sender wrote:\n> This is the original message\n> that was quoted",
      content_type: "text/plain",
      sender_type: "customer" as const,
      sender_id: "customer1",
      is_internal: false,
      attachments: null,
      created_at: "2024-01-01T10:00:00Z",
    }

    const normalizedMessage = normalizeMessage(rawMessage, testNormalizationContext)
    const queryClient = createTestQueryClient()

    render(
      <QueryClientProvider client={queryClient}>
        <MessageItem message={normalizedMessage} conversation={mockConversation} />
      </QueryClientProvider>,
    )

    const toggleButton = screen.getByRole("button", { name: /conversation\.showQuoted/i })

    // Initially quoted content should be hidden
    expect(screen.queryByText(/original message/i)).not.toBeInTheDocument()

    // Click to show quoted content
    fireEvent.click(toggleButton)

    // Button text should change
    expect(screen.getByRole("button", { name: /conversation\.hideQuoted/i })).toBeInTheDocument()

    // Click again to hide
    fireEvent.click(toggleButton)

    // Button text should change back
    expect(screen.getByRole("button", { name: /conversation\.showQuoted/i })).toBeInTheDocument()
  })

  test("handles HTML quoted content with blockquotes", async () => {
    const rawMessage = {
      id: "1",
      content:
        "<p>This is my reply to your earlier question.</p><blockquote><p>This is the quoted content</p></blockquote>",
      content_type: "text/html",
      sender_type: "customer" as const,
      sender_id: "customer1",
      is_internal: false,
      attachments: null,
      created_at: "2024-01-01T10:00:00Z",
    }

    const normalizedMessage = normalizeMessage(rawMessage, testNormalizationContext)
    const queryClient = createTestQueryClient()

    render(
      <QueryClientProvider client={queryClient}>
        <MessageItem message={normalizedMessage} conversation={mockConversation} />
      </QueryClientProvider>,
    )

    // Should detect HTML quoted content and show toggle
    const toggleButton = screen.getByRole("button", { name: /conversation\.showQuoted/i })
    expect(toggleButton).toBeInTheDocument()
  })

  test("handles email headers pattern", async () => {
    const rawMessage = {
      id: "1",
      content:
        "Thanks for your email.\n\n-----Original Message-----\nFrom: sender@example.com\nTo: recipient@example.com\nSent: Monday, January 1, 2024\n\nOriginal email content here.",
      content_type: "text/plain",
      sender_type: "agent" as const,
      sender_id: "agent1",
      is_internal: false,
      attachments: null,
      created_at: "2024-01-01T10:00:00Z",
    }

    const normalizedMessage = normalizeMessage(rawMessage, testNormalizationContext)
    const queryClient = createTestQueryClient()

    render(
      <QueryClientProvider client={queryClient}>
        <MessageItem message={normalizedMessage} conversation={mockConversation} />
      </QueryClientProvider>,
    )

    // Should detect email headers pattern and show toggle
    const toggleButton = screen.getByRole("button", { name: /conversation\.showQuoted/i })
    expect(toggleButton).toBeInTheDocument()
  })
})
