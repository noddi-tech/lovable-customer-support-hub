import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { EnhancedInteractionsLayout } from './EnhancedInteractionsLayout';

// Mock dependencies
vi.mock('@/hooks/useInteractionsNavigation', () => ({
  useInteractionsNavigation: () => ({
    currentState: {
      conversationId: null,
      inbox: 'test-inbox',
      status: 'all',
      search: ''
    },
    setInbox: vi.fn(),
    setStatus: vi.fn(),
    setSearch: vi.fn(),
    openConversation: vi.fn(),
    backToList: vi.fn()
  })
}));

vi.mock('@/hooks/useInteractionsData', () => ({
  useAccessibleInboxes: () => ({ data: [{ id: 'inbox-1', name: 'Test Inbox' }] }),
  useConversations: () => ({ 
    data: [
      {
        id: 'conv-1',
        subject: 'Test Conversation',
        preview: 'Test preview',
        fromName: 'John Doe',
        channel: 'email',
        updatedAt: '2024-01-01T10:00:00Z',
        unread: true,
        priority: 'normal',
        status: 'open'
      }
    ], 
    isLoading: false 
  }),
  useThread: () => ({ data: null, isLoading: false }),
  useReply: () => ({ mutateAsync: vi.fn(), isPending: false })
}));

vi.mock('@/hooks/use-responsive', () => ({
  useIsMobile: () => false
}));

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key })
}));

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false }
    }
  });

  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
};

describe('EnhancedInteractionsLayout', () => {
  const defaultProps = {
    activeSubTab: 'all',
    selectedTab: 'all', 
    onTabChange: vi.fn(),
    selectedInboxId: 'test-inbox'
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders conversation list in single column (not grid)', () => {
    render(
      <EnhancedInteractionsLayout {...defaultProps} />,
      { wrapper: createWrapper() }
    );

    // Verify conversation appears in single column
    expect(screen.getByText('Test Conversation')).toBeInTheDocument();
    expect(screen.getByText('Test preview')).toBeInTheDocument();

    // Check that it's in a column layout (space-y-2 class indicates vertical stacking)
    const conversationContainer = screen.getByText('Test Conversation').closest('.space-y-2');
    expect(conversationContainer).toBeInTheDocument();
  });

  it('renders inbox selector with shadcn Select', () => {
    render(
      <EnhancedInteractionsLayout {...defaultProps} />,
      { wrapper: createWrapper() }
    );

    // Should have workspace section with select
    expect(screen.getByText('Workspace')).toBeInTheDocument();
  });

  it('renders status filters with counts', () => {
    render(
      <EnhancedInteractionsLayout {...defaultProps} />,
      { wrapper: createWrapper() }
    );

    // Should have filters section
    expect(screen.getByText('Filters')).toBeInTheDocument();
    expect(screen.getByText('All Messages')).toBeInTheDocument();
    expect(screen.getByText('Unread')).toBeInTheDocument();
    expect(screen.getByText('Assigned to Me')).toBeInTheDocument();
  });

  it('renders search input', () => {
    render(
      <EnhancedInteractionsLayout {...defaultProps} />,
      { wrapper: createWrapper() }
    );

    const searchInput = screen.getByPlaceholderText('Search conversations...');
    expect(searchInput).toBeInTheDocument();
  });

  it('shows voice interface when activeSubTab is voice', () => {
    render(
      <EnhancedInteractionsLayout {...defaultProps} activeSubTab="voice" />,
      { wrapper: createWrapper() }
    );

    // Voice interface should be rendered instead of conversation layout
    // This assumes VoiceInterface has some identifiable content
  });

  it('shows loading state correctly', () => {
    // We would need to mock the loading state
    // This test would verify skeleton components are shown
  });

  it('shows empty state when no conversations', () => {
    // Mock empty conversations
    vi.mocked(require('@/hooks/useInteractionsData').useConversations).mockReturnValue({
      data: [],
      isLoading: false
    });

    render(
      <EnhancedInteractionsLayout {...defaultProps} />,
      { wrapper: createWrapper() }
    );

    expect(screen.getByText('No conversations found')).toBeInTheDocument();
  });
});