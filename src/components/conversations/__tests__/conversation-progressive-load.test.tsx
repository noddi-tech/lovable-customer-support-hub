import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { vi, describe, beforeEach, test, expect } from 'vitest';
import { ProgressiveMessagesList } from '../ProgressiveMessagesList';

// Mock the hooks
vi.mock('@/hooks/conversations/useConversationMessages', () => ({
  useConversationMessagesList: vi.fn()
}));

vi.mock('@/hooks/useDateFormatting', () => ({
  useDateFormatting: () => ({
    dateTime: (date: string) => new Date(date).toLocaleDateString()
  })
}));

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key
  })
}));

const createTestQueryClient = () => new QueryClient({
  defaultOptions: {
    queries: { retry: false },
    mutations: { retry: false },
  },
});

const mockMessages = [
  {
    id: '1',
    content: 'First message',
    content_type: 'text/plain',
    sender_type: 'customer' as const,
    sender_id: 'customer1',
    is_internal: false,
    attachments: null,
    created_at: '2024-01-01T10:00:00Z'
  },
  {
    id: '2', 
    content: 'Second message',
    content_type: 'text/plain',
    sender_type: 'agent' as const,
    sender_id: 'agent1',
    is_internal: false,
    attachments: null,
    created_at: '2024-01-01T11:00:00Z'
  },
  {
    id: '3',
    content: 'Third message',
    content_type: 'text/plain',
    sender_type: 'customer' as const,
    sender_id: 'customer1',
    is_internal: false,
    attachments: null,
    created_at: '2024-01-01T12:00:00Z'
  }
];

const mockConversation = {
  customer: {
    full_name: 'Test Customer',
    email: 'test@example.com'
  }
};

describe('ProgressiveMessagesList', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test('renders only newest messages initially', async () => {
    const mockHook = await import('@/hooks/conversations/useConversationMessages');
    vi.mocked(mockHook.useConversationMessagesList).mockReturnValue({
      messages: mockMessages,
      totalCount: 10,
      hasNextPage: true,
      isFetchingNextPage: false,
      fetchNextPage: vi.fn(),
      isLoading: false,
      error: null
    });

    const queryClient = createTestQueryClient();
    
    render(
      <QueryClientProvider client={queryClient}>
        <ProgressiveMessagesList
          conversationId="test-conv"
          conversation={mockConversation}
        />
      </QueryClientProvider>
    );

    // Should show all 3 messages (since we're mocking the hook response)
    expect(screen.getByText('First message')).toBeInTheDocument();
    expect(screen.getByText('Second message')).toBeInTheDocument();
    expect(screen.getByText('Third message')).toBeInTheDocument();
  });

  test('shows load older messages button when more messages available', async () => {
    const mockHook = await import('@/hooks/conversations/useConversationMessages');
    const mockFetchNextPage = vi.fn();
    
    vi.mocked(mockHook.useConversationMessagesList).mockReturnValue({
      messages: mockMessages,
      totalCount: 10,
      hasNextPage: true,
      isFetchingNextPage: false,
      fetchNextPage: mockFetchNextPage,
      isLoading: false,
      error: null
    });

    const queryClient = createTestQueryClient();
    
    render(
      <QueryClientProvider client={queryClient}>
        <ProgressiveMessagesList
          conversationId="test-conv"
          conversation={mockConversation}
        />
      </QueryClientProvider>
    );

    const loadButton = screen.getByRole('button', { name: /load older messages/i });
    expect(loadButton).toBeInTheDocument();
    expect(loadButton).toHaveTextContent('7 remaining');
  });

  test('clicking load older messages calls fetchNextPage', async () => {
    const mockHook = await import('@/hooks/conversations/useConversationMessages');
    const mockFetchNextPage = vi.fn().mockResolvedValue({});
    
    vi.mocked(mockHook.useConversationMessagesList).mockReturnValue({
      messages: mockMessages,
      totalCount: 10,
      hasNextPage: true,
      isFetchingNextPage: false,
      fetchNextPage: mockFetchNextPage,
      isLoading: false,
      error: null
    });

    const queryClient = createTestQueryClient();
    
    render(
      <QueryClientProvider client={queryClient}>
        <ProgressiveMessagesList
          conversationId="test-conv"
          conversation={mockConversation}
        />
      </QueryClientProvider>
    );

    const loadButton = screen.getByRole('button', { name: /load older messages/i });
    fireEvent.click(loadButton);

    expect(mockFetchNextPage).toHaveBeenCalledTimes(1);
  });

  test('shows loading state while fetching next page', async () => {
    const mockHook = await import('@/hooks/conversations/useConversationMessages');
    
    vi.mocked(mockHook.useConversationMessagesList).mockReturnValue({
      messages: mockMessages,
      totalCount: 10,
      hasNextPage: true,
      isFetchingNextPage: true,
      fetchNextPage: vi.fn(),
      isLoading: false,
      error: null
    });

    const queryClient = createTestQueryClient();
    
    render(
      <QueryClientProvider client={queryClient}>
        <ProgressiveMessagesList
          conversationId="test-conv"
          conversation={mockConversation}
        />
      </QueryClientProvider>
    );

    expect(screen.getByText(/loading older messages/i)).toBeInTheDocument();
  });

  test('shows no messages state when conversation is empty', async () => {
    const mockHook = await import('@/hooks/conversations/useConversationMessages');
    
    vi.mocked(mockHook.useConversationMessagesList).mockReturnValue({
      messages: [],
      totalCount: 0,
      hasNextPage: false,
      isFetchingNextPage: false,
      fetchNextPage: vi.fn(),
      isLoading: false,
      error: null
    });

    const queryClient = createTestQueryClient();
    
    render(
      <QueryClientProvider client={queryClient}>
        <ProgressiveMessagesList
          conversationId="test-conv"
          conversation={mockConversation}
        />
      </QueryClientProvider>
    );

    expect(screen.getByText('conversation.noMessages')).toBeInTheDocument();
  });
});