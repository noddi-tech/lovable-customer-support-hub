import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ProgressiveMessagesList } from '../ProgressiveMessagesList';
import { useThreadMessagesList } from '@/hooks/conversations/useThreadMessagesList';
import { vi } from 'vitest';

// Mock the hook
vi.mock('@/hooks/conversations/useThreadMessagesList');
const mockUseThreadMessagesList = vi.mocked(useThreadMessagesList);

// Mock react-i18next
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

// Mock date formatting hook
vi.mock('@/hooks/useDateFormatting', () => ({
  useDateFormatting: () => ({
    dateTime: (date: string) => new Date(date).toLocaleString(),
  }),
}));

const createQueryClient = () => new QueryClient({
  defaultOptions: {
    queries: { retry: false },
    mutations: { retry: false },
  },
});

const renderWithProviders = (component: React.ReactElement) => {
  const queryClient = createQueryClient();
  return render(
    <QueryClientProvider client={queryClient}>
      {component}
    </QueryClientProvider>
  );
};

const mockMessages = [
  {
    id: 'msg-1',
    dedupKey: 'id:msg-1',
    createdAt: '2025-01-11T10:00:00Z',
    channel: 'email',
    from: { email: 'customer@example.com', name: 'Customer' },
    to: [],
    direction: 'inbound' as const,
    authorType: 'customer' as const,
    authorLabel: 'Customer',
    avatarInitial: 'C',
    visibleBody: 'This is the first message content',
    originalMessage: {
      id: 'msg-1',
      content: 'This is the first message content',
      content_type: 'text/plain',
      sender_type: 'customer',
      email_subject: 'Test Subject',
      is_internal: false,
    },
  },
  {
    id: 'msg-2',
    dedupKey: 'id:msg-2',
    createdAt: '2025-01-11T11:00:00Z',
    channel: 'email',
    from: { email: 'agent@company.com', name: 'Agent' },
    to: [],
    direction: 'outbound' as const,
    authorType: 'agent' as const,
    authorLabel: 'Agent (agent@company.com)',
    avatarInitial: 'A',
    visibleBody: 'This is the agent reply',
    originalMessage: {
      id: 'msg-2',
      content: 'This is the agent reply',
      content_type: 'text/plain',
      sender_type: 'agent',
      email_subject: 'Re: Test Subject',
      is_internal: false,
    },
  },
  {
    id: 'msg-3',
    dedupKey: 'id:msg-3',
    createdAt: '2025-01-11T12:00:00Z',
    channel: 'email',
    from: { email: 'customer@example.com', name: 'Customer' },
    to: [],
    direction: 'inbound' as const,
    authorType: 'customer' as const,
    authorLabel: 'Customer',
    avatarInitial: 'C',
    visibleBody: 'Follow-up from customer',
    originalMessage: {
      id: 'msg-3',
      content: 'Follow-up from customer',
      content_type: 'text/plain',
      sender_type: 'customer',
      email_subject: 'Re: Test Subject',
      is_internal: false,
    },
  },
];

describe('ProgressiveMessagesList - Thread View', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('loads 3 newest cards initially', async () => {
    mockUseThreadMessagesList.mockReturnValue({
      messages: mockMessages,
      totalCount: 5,
      loadedCount: 3,
      remaining: 2,
      hasNextPage: true,
      isFetchingNextPage: false,
      fetchNextPage: vi.fn(),
      isLoading: false,
      error: null,
    });

    renderWithProviders(
      <ProgressiveMessagesList
        conversationId="test-conversation"
        conversation={{ customer: { email: 'customer@example.com' } }}
      />
    );

    // Should show 3 messages
    expect(screen.getByText('3 messages')).toBeInTheDocument();
    
    // Should show all message cards
    expect(screen.getByText('This is the first message content')).toBeInTheDocument();
    expect(screen.getByText('This is the agent reply')).toBeInTheDocument();
    expect(screen.getByText('Follow-up from customer')).toBeInTheDocument();
  });

  it('shows "Load older messages" with remaining count', () => {
    const mockFetchNextPage = vi.fn();
    mockUseThreadMessagesList.mockReturnValue({
      messages: mockMessages,
      totalCount: 5,
      loadedCount: 3,
      remaining: 2,
      hasNextPage: true,
      isFetchingNextPage: false,
      fetchNextPage: mockFetchNextPage,
      isLoading: false,
      error: null,
    });

    renderWithProviders(
      <ProgressiveMessagesList
        conversationId="test-conversation"
        conversation={{ customer: { email: 'customer@example.com' } }}
      />
    );

    const loadOlderButton = screen.getByText('Load older messages (2 remaining)');
    expect(loadOlderButton).toBeInTheDocument();

    // Click to load more
    fireEvent.click(loadOlderButton);
    expect(mockFetchNextPage).toHaveBeenCalled();
  });

  it('shows no quoted content (thread-aware view)', () => {
    mockUseThreadMessagesList.mockReturnValue({
      messages: [
        {
          ...mockMessages[0],
          avatarInitial: 'C',
          quotedBlocks: [
            { kind: 'gmail' as const, raw: 'Some quoted content' },
          ],
        },
      ],
      totalCount: 1,
      loadedCount: 1,
      remaining: 0,
      hasNextPage: false,
      isFetchingNextPage: false,
      fetchNextPage: vi.fn(),
      isLoading: false,
      error: null,
    });

    renderWithProviders(
      <ProgressiveMessagesList
        conversationId="test-conversation"
        conversation={{ customer: { email: 'customer@example.com' } }}
      />
    );

    // Should not show quoted content toggle
    expect(screen.queryByText(/Show quoted history/)).not.toBeInTheDocument();
    expect(screen.queryByText(/Hide quoted history/)).not.toBeInTheDocument();
    
    // Should not show the quoted content itself
    expect(screen.queryByText('Some quoted content')).not.toBeInTheDocument();
  });

  it('shows proper sender attribution per card', () => {
    mockUseThreadMessagesList.mockReturnValue({
      messages: mockMessages,
      totalCount: 3,
      loadedCount: 3,
      remaining: 0,
      hasNextPage: false,
      isFetchingNextPage: false,
      fetchNextPage: vi.fn(),
      isLoading: false,
      error: null,
    });

    renderWithProviders(
      <ProgressiveMessagesList
        conversationId="test-conversation"
        conversation={{ customer: { email: 'customer@example.com' } }}
      />
    );

    // Check customer attribution
    expect(screen.getAllByText('Customer')).toHaveLength(2);
    
    // Check agent attribution
    expect(screen.getByText('Agent (agent@company.com)')).toBeInTheDocument();
  });

  it('shows correct remaining count decreases', () => {
    const mockFetchNextPage = vi.fn();
    
    // Initial state
    mockUseThreadMessagesList.mockReturnValue({
      messages: mockMessages.slice(0, 2),
      totalCount: 5,
      loadedCount: 2,
      remaining: 3,
      hasNextPage: true,
      isFetchingNextPage: false,
      fetchNextPage: mockFetchNextPage,
      isLoading: false,
      error: null,
    });

    const { rerender } = renderWithProviders(
      <ProgressiveMessagesList
        conversationId="test-conversation"
        conversation={{ customer: { email: 'customer@example.com' } }}
      />
    );

    expect(screen.getByText('Load older messages (3 remaining)')).toBeInTheDocument();

    // After loading more
    mockUseThreadMessagesList.mockReturnValue({
      messages: mockMessages,
      totalCount: 5,
      loadedCount: 3,
      remaining: 2,
      hasNextPage: true,
      isFetchingNextPage: false,
      fetchNextPage: mockFetchNextPage,
      isLoading: false,
      error: null,
    });

    rerender(
      <ProgressiveMessagesList
        conversationId="test-conversation"
        conversation={{ customer: { email: 'customer@example.com' } }}
      />
    );

    expect(screen.getByText('Load older messages (2 remaining)')).toBeInTheDocument();
  });

  it('handles loading state', () => {
    mockUseThreadMessagesList.mockReturnValue({
      messages: [],
      totalCount: 0,
      loadedCount: 0,
      remaining: 0,
      hasNextPage: false,
      isFetchingNextPage: false,
      fetchNextPage: vi.fn(),
      isLoading: true,
      error: null,
    });

    renderWithProviders(
      <ProgressiveMessagesList
        conversationId="test-conversation"
        conversation={{ customer: { email: 'customer@example.com' } }}
      />
    );

    // Should show loading spinner (Loader2 icon)
    expect(document.querySelector('.animate-spin')).toBeInTheDocument();
  });

  it('handles error state', () => {
    mockUseThreadMessagesList.mockReturnValue({
      messages: [],
      totalCount: 0,
      loadedCount: 0,
      remaining: 0,
      hasNextPage: false,
      isFetchingNextPage: false,
      fetchNextPage: vi.fn(),
      isLoading: false,
      error: new Error('Failed to load messages'),
    });

    renderWithProviders(
      <ProgressiveMessagesList
        conversationId="test-conversation"
        conversation={{ customer: { email: 'customer@example.com' } }}
      />
    );

    expect(screen.getByText('Error loading messages')).toBeInTheDocument();
    expect(screen.getByText('Failed to load messages')).toBeInTheDocument();
  });

  it('does not show load older button when no more pages', () => {
    mockUseThreadMessagesList.mockReturnValue({
      messages: mockMessages,
      totalCount: 3,
      loadedCount: 3,
      remaining: 0,
      hasNextPage: false,
      isFetchingNextPage: false,
      fetchNextPage: vi.fn(),
      isLoading: false,
      error: null,
    });

    renderWithProviders(
      <ProgressiveMessagesList
        conversationId="test-conversation"
        conversation={{ customer: { email: 'customer@example.com' } }}
      />
    );

    expect(screen.queryByText(/Load older messages/)).not.toBeInTheDocument();
  });
});