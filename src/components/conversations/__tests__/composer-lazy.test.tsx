import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { fireEvent, render, screen } from "@testing-library/react"
import { beforeEach, describe, expect, test, vi } from "vitest"
import { LazyReplyArea } from "../LazyReplyArea"

vi.mock("@/hooks/use-responsive", () => ({
  useIsMobile: () => false,
}))

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}))

const dispatchMock = vi.fn()
let showReplyArea = false

vi.mock("@/contexts/ConversationViewContext", () => ({
  useConversationView: () => ({
    state: { showReplyArea },
    dispatch: dispatchMock,
  }),
}))

vi.mock("@/components/dashboard/conversation-view/ReplyArea", () => ({
  ReplyArea: () => <div data-testid="reply-area">Reply Area Loaded</div>,
}))

const createTestQueryClient = () =>
  new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  })

function renderLazy() {
  const queryClient = createTestQueryClient()
  return render(
    <QueryClientProvider client={queryClient}>
      <LazyReplyArea conversationId="test-conv" />
    </QueryClientProvider>,
  )
}

describe("LazyReplyArea", () => {
  beforeEach(() => {
    showReplyArea = false
    dispatchMock.mockReset()
  })

  test("shows reply button when composer is closed", () => {
    renderLazy()

    expect(screen.getByRole("button", { name: /conversation.reply/i })).toBeInTheDocument()
    expect(screen.queryByTestId("reply-area")).not.toBeInTheDocument()
  })

  test("reply button opens composer via context dispatch", () => {
    renderLazy()

    fireEvent.click(screen.getByRole("button", { name: /conversation.reply/i }))

    expect(dispatchMock).toHaveBeenCalledWith({ type: "SET_SHOW_REPLY_AREA", payload: true })
    expect(dispatchMock).toHaveBeenCalledWith({ type: "SET_IS_INTERNAL_NOTE", payload: false })
  })

  test("note button opens composer in internal-note mode", () => {
    renderLazy()

    fireEvent.click(screen.getByRole("button", { name: /conversation.internalNote/i }))

    expect(dispatchMock).toHaveBeenCalledWith({ type: "SET_SHOW_REPLY_AREA", payload: true })
    expect(dispatchMock).toHaveBeenCalledWith({ type: "SET_IS_INTERNAL_NOTE", payload: true })
  })

  test("renders reply area when context showReplyArea is true", async () => {
    showReplyArea = true
    renderLazy()

    expect(await screen.findByTestId("reply-area")).toBeInTheDocument()
    expect(screen.queryByRole("button", { name: /conversation.reply/i })).not.toBeInTheDocument()
  })
})
