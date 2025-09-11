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

describe('MessageCard - Gmail Quote Detection', () => {
  it('detects Gmail quoted content and hides it from visible content', () => {
    const emailWithGmailQuote = `<div>Hi there,<br><br>Thanks for your message.</div>
<div class="gmail_quote">
<div>On Thu, Jan 4, 2024 at 3:30 PM John Doe &lt;<a href="mailto:john@example.com">john@example.com</a>&gt; wrote:<br></div>
<blockquote>
<div>Hi,<br><br>I need help with my account.<br><br>Best regards,<br>John</div>
</blockquote>
</div>`;

    const message = normalizeMessage({
      id: 'test-msg',
      content: emailWithGmailQuote,
      content_type: 'text/html',
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

    // Should show only the visible content
    expect(screen.getByTestId('email-content')).toHaveTextContent('Hi there,Thanks for your message.');
    
    // Should have quoted content available
    expect(message.quotedBlocks).toBeDefined();
    expect(message.quotedBlocks?.[0]?.kind).toBe('gmail');
    
    // Should show quoted history toggle
    expect(screen.getByText(/Show quoted history/i)).toBeInTheDocument();
  });
});