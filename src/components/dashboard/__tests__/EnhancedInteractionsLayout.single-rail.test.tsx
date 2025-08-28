import { render, screen } from "@testing-library/react";
import { BrowserRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { vi, describe, it, beforeEach, expect } from "vitest";
import { EnhancedInteractionsLayout } from "../EnhancedInteractionsLayout";

// Mock the hooks and components
vi.mock("@/hooks/use-responsive", () => ({
  useIsMobile: () => false,
}));

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
}));

vi.mock("@/hooks/useInteractionsData", () => ({
  useAccessibleInboxes: () => ({ data: [{ id: "test-inbox", name: "Test Inbox" }] }),
  useConversations: () => ({ data: [], isLoading: false }),
  useThread: () => ({ data: { subject: "Test Thread", customer: { full_name: "Test Customer", email: "test@example.com" } }, isLoading: false }),
  useReply: () => ({ mutateAsync: vi.fn(), isPending: false }),
}));

vi.mock("../ConversationView", () => ({
  ConversationView: ({ conversationId }: { conversationId: string }) => <div data-testid="conversation-view">{conversationId}</div>,
}));

vi.mock("@/components/admin/design/components/detail/ReplySidebar", () => ({
  ReplySidebar: (props: any) => <div data-testid="reply-sidebar">Reply Sidebar</div>,
}));

vi.mock("@/components/admin/design/components/layouts/InboxList", () => ({
  InboxList: () => <div data-testid="inbox-list">Inbox List</div>,
}));

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string, defaultValue?: string) => defaultValue || key,
  }),
}));

const TestWrapper = ({ children }: { children: React.ReactNode }) => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        {children}
      </BrowserRouter>
    </QueryClientProvider>
  );
};

describe("EnhancedInteractionsLayout", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders exactly two panes in detail mode", () => {
    render(
      <TestWrapper>
        <EnhancedInteractionsLayout
          activeSubTab="conversations"
          selectedTab="interactions"
          onTabChange={vi.fn()}
          selectedInboxId="test-inbox"
        />
      </TestWrapper>
    );

    const grid = screen.getByTestId("detail-grid");
    expect(grid).toBeInTheDocument();
    expect(grid.childElementCount).toBe(2);
  });

  it("does not have width clamps in interactions subtree", () => {
    render(
      <TestWrapper>
        <EnhancedInteractionsLayout
          activeSubTab="conversations"
          selectedTab="interactions"
          onTabChange={vi.fn()}
          selectedInboxId="test-inbox"
        />
      </TestWrapper>
    );

    const interactionsRoot = screen.getByTestId("interactions-root");
    const allElements = interactionsRoot.querySelectorAll("*");
    
    allElements.forEach((element) => {
      const className = element.className?.toString() || "";
      expect(className).not.toMatch(/\b(container|mx-auto|max-w-)\b/);
    });
  });

  it("detail grid has exactly two panes and no inner horizontal padding", () => {
    render(
      <TestWrapper>
        <EnhancedInteractionsLayout
          activeSubTab="conversations"
          selectedTab="interactions"
          onTabChange={vi.fn()}
          selectedInboxId="test-inbox"
        />
      </TestWrapper>
    );

    const grid = screen.getByTestId("detail-grid");
    expect(grid.childElementCount).toBe(2); // thread + right rail

    // Check immediate children for px-0 (or 0 computed padding-left/right)
    Array.from(grid.children).forEach((child) => {
      const cs = window.getComputedStyle(child as HTMLElement);
      expect(parseFloat(cs.paddingLeft)).toBeLessThanOrEqual(1);
      expect(parseFloat(cs.paddingRight)).toBeLessThanOrEqual(1);
    });
  });
});