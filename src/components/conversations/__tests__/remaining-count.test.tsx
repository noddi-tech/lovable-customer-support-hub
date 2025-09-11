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

describe('ProgressiveMessagesList - Remaining Count', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('shows accurate remaining count with high confidence', async () => {
    const mockUseConversationMessagesList = vi.mocked(useConversationMessagesList);
    mockUseConversationMessagesList.mockReturnValue({
      messages: [
        normalizeMessage({
          id: '1',
          content: 'Message 1',
          content_type: 'text/plain',
          sender_type: 'customer',
          sender_id: 'customer1',
          is_internal: false,
          attachments: null,
          created_at: '2024-01-01T10:00:00Z',
        }, testNormalizationContext),
      ],
      totalCount: 10,
      normalizedCount: 1,
      totalNormalizedEstimated: 10,
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

    await waitFor(() => {
      expect(screen.getByText('Load older messages (9 remaining)')).toBeInTheDocument();
    });
  });

  it('hides count with low confidence', async () => {
    const mockUseConversationMessagesList = vi.mocked(useConversationMessagesList);
    mockUseConversationMessagesList.mockReturnValue({
      messages: [
        normalizeMessage({
          id: '1',
          content: 'Message 1',
          content_type: 'text/plain',
          sender_type: 'customer',
          sender_id: 'customer1',
          is_internal: false,
          attachments: null,
          created_at: '2024-01-01T10:00:00Z',
        }, testNormalizationContext),
      ],
      totalCount: 3322,
      normalizedCount: 1,
      totalNormalizedEstimated: 3322,
      confidence: 'low' as const,
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

    await waitFor(() => {
      expect(screen.getByText('Load older messages')).toBeInTheDocument();
      expect(screen.queryByText(/remaining/)).not.toBeInTheDocument();
    });
  });

  it('hides count when remaining > 500', async () => {
    const mockUseConversationMessagesList = vi.mocked(useConversationMessagesList);
    mockUseConversationMessagesList.mockReturnValue({
      messages: [
        normalizeMessage({
          id: '1',
          content: 'Message 1',
          content_type: 'text/plain',
          sender_type: 'customer',
          sender_id: 'customer1',
          is_internal: false,
          attachments: null,
          created_at: '2024-01-01T10:00:00Z',
        }, testNormalizationContext),
      ],
      totalCount: 1000,
      normalizedCount: 1,
      totalNormalizedEstimated: 1000,
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

    await waitFor(() => {
      expect(screen.getByText('Load older messages')).toBeInTheDocument();
      expect(screen.queryByText(/999 remaining/)).not.toBeInTheDocument();
    });
  });

  it('hides load button when no more pages', async () => {
    const mockUseConversationMessagesList = vi.mocked(useConversationMessagesList);
    mockUseConversationMessagesList.mockReturnValue({
      messages: [
        normalizeMessage({
          id: '1',
          content: 'Message 1',
          content_type: 'text/plain',
          sender_type: 'customer',
          sender_id: 'customer1',
          is_internal: false,
          attachments: null,
          created_at: '2024-01-01T10:00:00Z',
        }, testNormalizationContext),
      ],
      totalCount: 1,
      normalizedCount: 1,
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
      expect(screen.queryByText(/Load older messages/)).not.toBeInTheDocument();
    });
  });
});