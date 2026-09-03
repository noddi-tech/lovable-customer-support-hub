import { render, screen } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"
import type { ConversationPriority, ConversationStatus } from "@/contexts/ConversationListContext"
import { createMockConversation } from "@/test/test-utils"
import { ConversationListItem } from "../conversation-list/ConversationListItem"

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
    render(<ConversationListItem {...defaultProps} />)

    expect(screen.getByText("Test Conversation")).toBeDefined()
    expect(screen.getByText("John Doe")).toBeDefined()
    expect(screen.getByText("john@example.com")).toBeDefined()
  })

  it("displays status and priority badges", () => {
    render(<ConversationListItem {...defaultProps} />)

    expect(screen.getByText("open")).toBeDefined()
    expect(screen.getByText("normal")).toBeDefined()
  })
})
