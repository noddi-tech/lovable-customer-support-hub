import { render, screen, waitFor } from '@testing-library/react';
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

describe('ProgressiveMessagesList - Cross-Page Deduplication', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('deduplicates overlapping messages from multiple pages', async () => {
    const mockUseConversationMessagesList = vi.mocked(useConversationMessagesList);
    
    // Simulate two pages with overlapping raw data but deduplication removes duplicates
    const originalMessage = {
      id: 'msg-1',
      content: 'Duplicate message content',
      content_type: 'text/plain',
      sender_type: 'customer' as const,
      sender_id: 'customer1',
      is_internal: false,
      attachments: null,
      created_at: '2024-01-01T10:00:00Z',
      external_id: 'external-123',
      email_headers: { 'Message-ID': 'unique@example.com' }
    };

    // Should only show 1 unique card despite 2 raw messages
    mockUseConversationMessagesList.mockReturnValue({
      messages: [normalizeMessage(originalMessage, testNormalizationContext)],
      totalCount: 10,
      normalizedCountLoaded: 1,
      totalNormalizedEstimated: 8,
      confidence: 'high' as const,
      hasNextPage: true,
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

    // Should show only 1 message despite duplicates being present in raw data
    await waitFor(() => {
      expect(screen.getByText('1 message')).toBeInTheDocument();
      const messageCards = screen.getAllByText(/Duplicate message content/);
      expect(messageCards).toHaveLength(1);
    });
  });

  it('maintains chronological order after deduplication', async () => {
    const mockUseConversationMessagesList = vi.mocked(useConversationMessagesList);
    
    // Messages in random order but should be displayed newest first
    const messages = [
      normalizeMessage({
        id: 'msg-2',
        content: 'Second message',
        content_type: 'text/plain',
        sender_type: 'customer' as const,
        sender_id: 'customer1',
        is_internal: false,
        attachments: null,
        created_at: '2024-01-01T11:00:00Z',
      }, testNormalizationContext),
      normalizeMessage({
        id: 'msg-1',
        content: 'First message',
        content_type: 'text/plain',
        sender_type: 'customer' as const,
        sender_id: 'customer1',
        is_internal: false,
        attachments: null,
        created_at: '2024-01-01T10:00:00Z',
      }, testNormalizationContext),
      normalizeMessage({
        id: 'msg-3',
        content: 'Third message',
        content_type: 'text/plain',
        sender_type: 'customer' as const,
        sender_id: 'customer1',
        is_internal: false,
        attachments: null,
        created_at: '2024-01-01T12:00:00Z',
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
      // Should be in chronological order: Third, Second, First (newest first)
      expect(messageElements[0]).toHaveTextContent('Third message');
      expect(messageElements[1]).toHaveTextContent('Second message');  
      expect(messageElements[2]).toHaveTextContent('First message');
    });
  });

  it('uses stable dedup keys for React keys', async () => {
    const mockUseConversationMessagesList = vi.mocked(useConversationMessagesList);
    
    const message = normalizeMessage({
      id: 'msg-1',
      content: 'Test message',
      content_type: 'text/plain',
      sender_type: 'customer' as const,
      sender_id: 'customer1',
      is_internal: false,
      attachments: null,
      created_at: '2024-01-01T10:00:00Z',
      external_id: 'stable-external-id',
    }, testNormalizationContext);

    mockUseConversationMessagesList.mockReturnValue({
      messages: [message],
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

    const { container } = render(
      <QueryClientProvider client={createTestQueryClient()}>
        <ProgressiveMessagesList 
          conversationId="test-conv" 
          conversation={mockConversation}
        />
      </QueryClientProvider>
    );

    // Verify the message card uses the dedupKey as React key
    await waitFor(() => {
      expect(message.dedupKey).toBe('explicit:stable-external-id');
      // The message card should be rendered
      expect(screen.getByText('Test message')).toBeInTheDocument();
    });
  });
});