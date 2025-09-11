import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { vi, describe, it, expect } from 'vitest';
import { MessageCard } from '../MessageCard';
import { normalizeMessage, createNormalizationContext } from '@/lib/normalizeMessage';

// Mock dependencies
vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

vi.mock('@/hooks/useDateFormatting', () => ({
  useDateFormatting: () => ({
    dateTime: (date: string) => new Date(date).toLocaleString(),
  }),
}));

vi.mock('@/components/ui/email-render', () => ({
  EmailRender: ({ content }: { content: string }) => <div data-testid="email-content">{content}</div>,
}));

const createTestQueryClient = () => new QueryClient({
  defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
});

const mockConversation = { 
  id: 'test-conversation', 
  customer: { full_name: 'Test Customer', email: 'customer@example.com' }
};

const testNormalizationContext = createNormalizationContext({
  currentUserEmail: 'agent@test.com',
  agentEmails: ['agent@test.com'],
});

describe('MessageCard - Plain Text Angle Quote Detection', () => {
  it('detects lines starting with > as quoted content', () => {
    const emailWithAngleQuotes = `Thanks for the information.

> Hi there,
> 
> I wanted to ask about my order status.
> Can you please check?
> 
> Thanks,
> Customer`;

    const message = normalizeMessage({
      id: 'test-msg',
      content: emailWithAngleQuotes,
      content_type: 'text/plain',
      sender_type: 'agent',
      sender_id: 'agent1',
      is_internal: false,
      attachments: null,
      created_at: '2024-01-04T16:30:00Z',
    }, testNormalizationContext);

    render(
      <QueryClientProvider client={createTestQueryClient()}>
        <MessageCard message={message} conversation={mockConversation} defaultCollapsed={false} />
      </QueryClientProvider>
    );

    // Should show only the new content
    expect(screen.getByTestId('email-content')).toHaveTextContent('Thanks for the information.');
    
    // Should have quoted content available
    expect(message.quotedBlocks).toBeDefined();
    expect(message.quotedBlocks?.[0]?.kind).toBe('plain');
    
    // Should show quoted history toggle
    expect(screen.getByText(/Show quoted history/i)).toBeInTheDocument();
  });

  it('handles mixed content with some angle quotes', () => {
    const emailWithMixedContent = `Here's my response to your question.

Some additional context here.

> Original question:
> What's the status of my account?

Let me know if you need anything else.`;

    const message = normalizeMessage({
      id: 'test-msg',
      content: emailWithMixedContent,
      content_type: 'text/plain',
      sender_type: 'customer',
      sender_id: 'customer1',
      is_internal: false,
      attachments: null,
      created_at: '2024-01-04T16:30:00Z',
    }, testNormalizationContext);

    render(
      <QueryClientProvider client={createTestQueryClient()}>
        <MessageCard message={message} conversation={mockConversation} defaultCollapsed={false} />
      </QueryClientProvider>
    );

    // Should show only the content before quoted section
    const emailContent = screen.getByTestId('email-content');
    expect(emailContent).toHaveTextContent('Here\'s my response to your question.');
    expect(emailContent).toHaveTextContent('Some additional context here.');
    expect(emailContent).not.toHaveTextContent('Original question:');
    
    // Should have quoted content available
    expect(message.quotedBlocks).toBeDefined();
    expect(message.quotedBlocks?.[0]?.kind).toBe('plain');
    
    // Should show quoted history toggle
    expect(screen.getByText(/Show quoted history/i)).toBeInTheDocument();
  });
});