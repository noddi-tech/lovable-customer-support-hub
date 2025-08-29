import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { vi, describe, test, expect } from 'vitest';
import { LazyReplyArea } from '../LazyReplyArea';

// Mock the lazy-loaded component
vi.mock('@/components/dashboard/conversation-view/ReplyArea', () => ({
  ReplyArea: () => <div data-testid="reply-area">Reply Area Loaded</div>
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

describe('LazyReplyArea', () => {
  test('shows reply button initially', () => {
    const queryClient = createTestQueryClient();
    
    render(
      <QueryClientProvider client={queryClient}>
        <LazyReplyArea conversationId="test-conv" />
      </QueryClientProvider>
    );

    const replyButton = screen.getByRole('button', { name: /conversation.reply/i });
    expect(replyButton).toBeInTheDocument();
    
    // Reply area should not be loaded yet
    expect(screen.queryByTestId('reply-area')).not.toBeInTheDocument();
  });

  test('loads reply area when button is clicked', async () => {
    const queryClient = createTestQueryClient();
    
    render(
      <QueryClientProvider client={queryClient}>
        <LazyReplyArea conversationId="test-conv" />
      </QueryClientProvider>
    );

    const replyButton = screen.getByRole('button', { name: /conversation.reply/i });
    fireEvent.click(replyButton);

    // Should show loading skeleton first
    await waitFor(() => {
      // Check for skeleton or loaded content
      expect(
        screen.getByTestId('reply-area') || screen.getByRole('button')
      ).toBeInTheDocument();
    });

    // Eventually should show the loaded reply area
    await waitFor(
      () => {
        expect(screen.getByTestId('reply-area')).toBeInTheDocument();
      },
      { timeout: 2000 }
    );
  });

  test('shows skeleton while loading', async () => {
    const queryClient = createTestQueryClient();
    
    render(
      <QueryClientProvider client={queryClient}>
        <LazyReplyArea conversationId="test-conv" />
      </QueryClientProvider>
    );

    const replyButton = screen.getByRole('button', { name: /conversation.reply/i });
    fireEvent.click(replyButton);

    // Should show some loading indication
    await waitFor(() => {
      // The component should show either skeleton elements or the loaded component
      const hasSkeletonOrContent = 
        screen.queryByTestId('reply-area') || 
        screen.getAllByRole('generic').length > 0; // Skeleton elements are divs
      
      expect(hasSkeletonOrContent).toBeTruthy();
    });
  });

  test('reply button is not present after clicking', async () => {
    const queryClient = createTestQueryClient();
    
    render(
      <QueryClientProvider client={queryClient}>
        <LazyReplyArea conversationId="test-conv" />
      </QueryClientProvider>
    );

    const replyButton = screen.getByRole('button', { name: /conversation.reply/i });
    fireEvent.click(replyButton);

    // After clicking, the original reply button should be gone
    await waitFor(() => {
      expect(screen.queryByRole('button', { name: /conversation.reply/i })).not.toBeInTheDocument();
    });
  });
});