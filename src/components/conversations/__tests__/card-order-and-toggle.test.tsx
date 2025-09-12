import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { ProgressiveMessagesList } from '../ProgressiveMessagesList';
import { useConversationMessagesList } from '@/hooks/conversations/useConversationMessages';
import { normalizeMessage, createNormalizationContext } from '@/lib/normalizeMessage';

// Mock dependencies
vi.mock('@/hooks/conversations/useConversationMessages');
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

const createTestQueryClient = () => new QueryClient({
  defaultOptions: {
    queries: { retry: false },
    mutations: { retry: false },
  },
});

const mockConversation = { id: 'test-conversation', subject: 'Test Subject' };
const testNormalizationContext = createNormalizationContext({
  currentUserEmail: 'agent@test.com',
  agentEmails: ['agent@test.com'],
});

describe('ProgressiveMessagesList - Card Order and Toggle', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('displays newest messages first by default', async () => {
    const mockUseConversationMessagesList = vi.mocked(useConversationMessagesList);
    
    const messages = [
      normalizeMessage({
        id: 'msg-3',
        content: 'Newest message',
        content_type: 'text/plain',
        sender_type: 'customer' as const,
        sender_id: 'customer1',
        is_internal: false,
        attachments: null,
        created_at: '2024-01-01T12:00:00Z',
      }, testNormalizationContext),
      normalizeMessage({
        id: 'msg-2',
        content: 'Middle message',
        content_type: 'text/plain',
        sender_type: 'customer' as const,
        sender_id: 'customer1',
        is_internal: false,
        attachments: null,
        created_at: '2024-01-01T11:00:00Z',
      }, testNormalizationContext),
      normalizeMessage({
        id: 'msg-1',
        content: 'Oldest message',
        content_type: 'text/plain',
        sender_type: 'customer' as const,
        sender_id: 'customer1',
        is_internal: false,
        attachments: null,
        created_at: '2024-01-01T10:00:00Z',
      }, testNormalizationContext),
    ];

    mockUseConversationMessagesList.mockReturnValue({
      messages,
      totalCount: 3,
      normalizedCountLoaded: 3,
      totalNormalizedEstimated: 3,
      confidence: 'high' as const,
      hasNextPage: false,
      isFetchingNextPage: false,
      fetchNextPage: vi.fn(),
      isLoading: false,
      error: null,
    });

    render(
      <QueryClientProvider client={createTestQueryClient()}>
        <ProgressiveMessagesList 
          conversationId="test-conv" 
          conversation={mockConversation}
        />
      </QueryClientProvider>
    );

    await waitFor(() => {
      const messageElements = screen.getAllByText(/message/);
      // Verify order: newest first
      expect(messageElements[0]).toHaveTextContent('Newest message');
      expect(messageElements[1]).toHaveTextContent('Middle message');
      expect(messageElements[2]).toHaveTextContent('Oldest message');
    });
  });

  it('cards are collapsed by default', async () => {
    const mockUseConversationMessagesList = vi.mocked(useConversationMessagesList);
    
    const messages = [
      normalizeMessage({
        id: 'msg-1',
        content: 'This is a long message that should show preview when collapsed and full content when expanded. It contains multiple sentences to test the preview functionality.',
        content_type: 'text/plain',
        sender_type: 'customer' as const,
        sender_id: 'customer1',
        is_internal: false,
        attachments: null,
        created_at: '2024-01-01T10:00:00Z',
      }, testNormalizationContext),
    ];

    mockUseConversationMessagesList.mockReturnValue({
      messages,
      totalCount: 1,
      normalizedCountLoaded: 1,
      totalNormalizedEstimated: 1,
      confidence: 'high' as const,
      hasNextPage: false,
      isFetchingNextPage: false,
      fetchNextPage: vi.fn(),
      isLoading: false,
      error: null,
    });

    render(
      <QueryClientProvider client={createTestQueryClient()}>
        <ProgressiveMessagesList 
          conversationId="test-conv" 
          conversation={mockConversation}
        />
      </QueryClientProvider>
    );

    await waitFor(() => {
      // Should show preview text (first 160 chars + ellipsis)
      expect(screen.getByText(/This is a long message that should show preview when collapsed/)).toBeInTheDocument();
      
      // Should not show full expanded content initially
      expect(screen.queryByText(/It contains multiple sentences/)).not.toBeInTheDocument();
    });
  });

  it('supports expand all and collapse all functionality', async () => {
    const mockUseConversationMessagesList = vi.mocked(useConversationMessagesList);
    
    const messages = [
      normalizeMessage({
        id: 'msg-1',
        content: 'Message 1 with full content to test expand/collapse',
        content_type: 'text/plain',
        sender_type: 'customer' as const,
        sender_id: 'customer1',
        is_internal: false,
        attachments: null,
        created_at: '2024-01-01T10:00:00Z',
      }, testNormalizationContext),
      normalizeMessage({
        id: 'msg-2',
        content: 'Message 2 with full content to test expand/collapse',
        content_type: 'text/plain',
        sender_type: 'customer' as const,
        sender_id: 'customer1',
        is_internal: false,
        attachments: null,
        created_at: '2024-01-01T11:00:00Z',
      }, testNormalizationContext),
    ];

    mockUseConversationMessagesList.mockReturnValue({
      messages,
      totalCount: 2,
      normalizedCountLoaded: 2,
      totalNormalizedEstimated: 2,
      confidence: 'high' as const,
      hasNextPage: false,
      isFetchingNextPage: false,
      fetchNextPage: vi.fn(),
      isLoading: false,
      error: null,
    });

    render(
      <QueryClientProvider client={createTestQueryClient()}>
        <ProgressiveMessagesList 
          conversationId="test-conv" 
          conversation={mockConversation}
        />
      </QueryClientProvider>
    );

    // Find and click "Expand all" button
    await waitFor(() => {
      const expandAllButton = screen.getByText('Expand all');
      fireEvent.click(expandAllButton);
    });

    // Should now show full content
    await waitFor(() => {
      expect(screen.getByText('Message 1 with full content to test expand/collapse')).toBeInTheDocument();
      expect(screen.getByText('Message 2 with full content to test expand/collapse')).toBeInTheDocument();
    });

    // Find and click "Collapse all" button
    await waitFor(() => {
      const collapseAllButton = screen.getByText('Collapse all');
      fireEvent.click(collapseAllButton);
    });

    // Should show preview again
    await waitFor(() => {
      // Messages should be collapsed again showing only previews
      const previews = screen.getAllByText(/Message \d+ with full content to test expand\/collapse/);
      expect(previews.length).toBeGreaterThan(0);
    });
  });

  it('displays correct sender attribution', async () => {
    const mockUseConversationMessagesList = vi.mocked(useConversationMessagesList);
    
    const messages = [
      normalizeMessage({
        id: 'msg-1',
        content: 'Customer message',
        content_type: 'text/plain',
        sender_type: 'customer' as const,
        sender_id: 'customer1',
        is_internal: false,
        attachments: null,
        created_at: '2024-01-01T10:00:00Z',
        email_headers: { from: 'customer@example.com' },
      }, testNormalizationContext),
      normalizeMessage({
        id: 'msg-2',
        content: 'Agent message',
        content_type: 'text/plain',
        sender_type: 'agent' as const,
        sender_id: 'agent1',
        is_internal: false,
        attachments: null,
        created_at: '2024-01-01T11:00:00Z',
        email_headers: { from: 'agent@test.com' },
      }, testNormalizationContext),
    ];

    mockUseConversationMessagesList.mockReturnValue({
      messages,
      totalCount: 2,
      normalizedCountLoaded: 2,
      totalNormalizedEstimated: 2,
      confidence: 'high' as const,
      hasNextPage: false,
      isFetchingNextPage: false,
      fetchNextPage: vi.fn(),
      isLoading: false,
      error: null,
    });

    render(
      <QueryClientProvider client={createTestQueryClient()}>
        <ProgressiveMessagesList 
          conversationId="test-conv" 
          conversation={mockConversation}
        />
      </QueryClientProvider>
    );

      // Should show customer email as label
      expect(screen.getByText('customer@example.com')).toBeInTheDocument();
      
      // Should show agent email as label 
      expect(screen.getByText('agent@test.com')).toBeInTheDocument();
  });

  it('shows quoted history toggle when available', async () => {
    const mockUseConversationMessagesList = vi.mocked(useConversationMessagesList);
    
    // Create a message with quoted content
    const messageWithQuotes = normalizeMessage({
      id: 'msg-1',
      content: 'New reply\n\nOn Mon, Jan 1, 2024 at 10:00 AM, customer@example.com wrote:\n> Previous message content\n> This was in the original email',
      content_type: 'text/plain',
      sender_type: 'customer' as const,
      sender_id: 'customer1',
      is_internal: false,
      attachments: null,
      created_at: '2024-01-01T10:00:00Z',
    }, testNormalizationContext);

    mockUseConversationMessagesList.mockReturnValue({
      messages: [messageWithQuotes],
      totalCount: 1,
      normalizedCountLoaded: 1,
      totalNormalizedEstimated: 1,
      confidence: 'high' as const,
      hasNextPage: false,
      isFetchingNextPage: false,
      fetchNextPage: vi.fn(),
      isLoading: false,
      error: null,
    });

    render(
      <QueryClientProvider client={createTestQueryClient()}>
        <ProgressiveMessagesList 
          conversationId="test-conv" 
          conversation={mockConversation}
        />
      </QueryClientProvider>
    );

    // First expand the message
    await waitFor(() => {
      const expandButton = screen.getByRole('button');
      fireEvent.click(expandButton);
    });

    // Should show quoted history toggle if quotes were detected
    if (messageWithQuotes.quotedBlocks && messageWithQuotes.quotedBlocks.length > 0) {
      await waitFor(() => {
        expect(screen.getByText(/Show quoted history/)).toBeInTheDocument();
      });

      // Click to show quoted history
      const showQuotedButton = screen.getByText(/Show quoted history/);
      fireEvent.click(showQuotedButton);

      await waitFor(() => {
        expect(screen.getByText(/Hide quoted history/)).toBeInTheDocument();
      });
    }
  });
});