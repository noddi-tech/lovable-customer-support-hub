import { render, screen } from "@testing-library/react";
import { BrowserRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { vi, describe, it, beforeEach, expect } from "vitest";
import { EnhancedInteractionsLayout } from "../EnhancedInteractionsLayout";

// Create test wrapper
const createTestWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        {children}
      </BrowserRouter>
    </QueryClientProvider>
  );
};

// Mock the hooks
vi.mock("@/hooks/useInteractionsData", () => ({
  useAccessibleInboxes: () => ({
    data: [{ id: "test-inbox", name: "Test Inbox" }],
    isLoading: false,
  }),
  useConversations: () => ({
    data: {
      data: [
        {
          id: "test-conversation",
          subject: "Test Subject",
          status: "open",
          priority: "normal",
          customer: { name: "Test Customer", email: "test@example.com" },
          lastMessage: { createdAt: new Date().toISOString() },
        },
      ],
    },
    isLoading: false,
  }),
  useThread: () => ({
    data: [{ id: "test-message", content: "Test message" }],
    isLoading: false,
  }),
  useReply: () => ({
    mutate: vi.fn(),
    isPending: false,
  }),
}));

vi.mock("@/hooks/useInteractionsNavigation", () => ({
  useInteractionsNavigation: () => ({
    selectedConversationId: "test-conversation",
    selectedInboxId: "test-inbox",
    selectedStatus: "open",
    searchQuery: "",
    setInboxId: vi.fn(),
    setStatus: vi.fn(),
    setSearchQuery: vi.fn(),
    openConversation: vi.fn(),
    goBack: vi.fn(),
  }),
}));

vi.mock("@/hooks/use-responsive", () => ({
  useIsMobile: () => false,
}));

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string, fallback: string) => fallback,
  }),
}));

describe("EnhancedInteractionsLayout", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders exactly two panes in detail mode", () => {
    const Wrapper = createTestWrapper();
    
    render(
      <Wrapper>
        <EnhancedInteractionsLayout 
          activeSubTab="email"
          selectedTab="interactions"
          onTabChange={vi.fn()}
          selectedInboxId="test-inbox"
        />
      </Wrapper>
    );

    const detailGrid = screen.getByTestId("detail-grid");
    expect(detailGrid).toBeInTheDocument();
    expect(detailGrid.children).toHaveLength(2);
  });

  it("has no layout clamps in interactions root", () => {
    const Wrapper = createTestWrapper();
    
    render(
      <Wrapper>
        <EnhancedInteractionsLayout 
          activeSubTab="email"
          selectedTab="interactions"
          onTabChange={vi.fn()}
          selectedInboxId="test-inbox"
        />
      </Wrapper>
    );

    const interactionsRoot = document.getElementById("interactions-root");
    expect(interactionsRoot).toBeInTheDocument();
    
    // Check for clamp classes in the interactions subtree
    const clampPattern = /\b(container|mx-auto|max-w-)\b/;
    const elements = interactionsRoot?.querySelectorAll("*") || [];
    
    let hasClamps = false;
    elements.forEach((el) => {
      if (clampPattern.test(el.className || "")) {
        hasClamps = true;
      }
    });
    
    expect(hasClamps).toBe(false);
  });
});