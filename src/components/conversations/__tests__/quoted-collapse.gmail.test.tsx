import { render, screen, fireEvent } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { MessageItem } from '../MessageItem';
import { normalizeMessage, createNormalizationContext } from '@/lib/normalizeMessage';

// Mock dependencies
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

vi.mock('@/hooks/useDateFormatting', () => ({
  useDateFormatting: () => ({
    formatShortDateTime: (date: string) => new Date(date).toLocaleString(),
  }),
}));

vi.mock('@/components/ui/email-render', () => ({
  EmailRender: ({ content }: { content: string }) => <div data-testid="email-content">{content}</div>,
}));

const createTestQueryClient = () => new QueryClient({
  defaultOptions: {
    queries: { retry: false },
    mutations: { retry: false },
  },
});

const mockConversation = { 
  id: 'test-conversation', 
  subject: 'Test Subject',
  customer: { full_name: 'Test Customer', email: 'customer@example.com' }
};
const testNormalizationContext = createNormalizationContext({
  currentUserEmail: 'agent@test.com',
  agentEmails: ['agent@test.com'],
});

describe('MessageItem - Gmail Quote Collapse', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('collapses Gmail-style quoted content by default', () => {
    const emailWithGmailQuote = `Hi there,

Thanks for your message.

On Thu, Jan 4, 2024 at 3:30 PM John Doe <john@example.com> wrote:
> Hi,
> 
> I need help with my account.
> 
> Best regards,
> John`;

    const message = normalizeMessage({
      id: 'test-msg',
      content: emailWithGmailQuote,
      content_type: 'text/plain',
      sender_type: 'agent',
      sender_id: 'agent1',
      is_internal: false,
      attachments: null,
      created_at: '2024-01-04T16:30:00Z',
    }, testNormalizationContext);

    render(
      <QueryClientProvider client={createTestQueryClient()}>
        <MessageItem message={message} conversation={mockConversation} />
      </QueryClientProvider>
    );

    // Should show only the new content by default
    expect(screen.getByTestId('email-content')).toHaveTextContent('Hi there,\n\nThanks for your message.');
    
    // Should have a toggle for quoted content
    expect(screen.getByText(/Show quoted/i)).toBeInTheDocument();
  });

  it('expands quoted content when toggle is clicked', () => {
    const emailWithGmailQuote = `Reply content here.

On Thu, Jan 4, 2024 at 3:30 PM John Doe <john@example.com> wrote:
> Original message content
> with multiple lines`;

    const message = normalizeMessage({
      id: 'test-msg',
      content: emailWithGmailQuote,
      content_type: 'text/plain',
      sender_type: 'customer',
      sender_id: 'customer1',
      is_internal: false,
      attachments: null,
      created_at: '2024-01-04T16:30:00Z',
    }, testNormalizationContext);

    render(
      <QueryClientProvider client={createTestQueryClient()}>
        <MessageItem message={message} conversation={mockConversation} />
      </QueryClientProvider>
    );

    // Click the show quoted toggle
    const showQuotedButton = screen.getByText(/Show quoted/i);
    fireEvent.click(showQuotedButton);

    // Should now show the full content including quoted part
    expect(screen.getByText(/Hide quoted/i)).toBeInTheDocument();
  });

  it('handles Norwegian Gmail patterns', () => {
    const emailWithNorwegianQuote = `Takk for meldingen.

Den 4. jan. 2024 kl. 15:30 skrev John Doe <john@example.com>:
> Hei,
> 
> Jeg trenger hjelp med kontoen min.
> 
> Mvh,
> John`;

    const message = normalizeMessage({
      id: 'test-msg',
      content: emailWithNorwegianQuote,
      content_type: 'text/plain',
      sender_type: 'agent',
      sender_id: 'agent1',
      is_internal: false,
      attachments: null,
      created_at: '2024-01-04T16:30:00Z',
    }, testNormalizationContext);

    render(
      <QueryClientProvider client={createTestQueryClient()}>
        <MessageItem message={message} conversation={mockConversation} />
      </QueryClientProvider>
    );

    // Should collapse the Norwegian quoted content
    expect(screen.getByTestId('email-content')).toHaveTextContent('Takk for meldingen.');
    expect(screen.getByText(/Show quoted/i)).toBeInTheDocument();
  });

  it('handles email thread with multiple replies', () => {
    const threadEmail = `Latest reply here.

On Jan 4, 2024, at 4:00 PM, Agent <agent@company.com> wrote:
> Thanks for the update.
> 
> On Jan 4, 2024, at 3:30 PM, Customer <customer@example.com> wrote:
>> Original message about account issue.`;

    const message = normalizeMessage({
      id: 'test-msg',
      content: threadEmail,
      content_type: 'text/plain',
      sender_type: 'customer',
      sender_id: 'customer1',
      is_internal: false,
      attachments: null,
      created_at: '2024-01-04T17:00:00Z',
    }, testNormalizationContext);

    render(
      <QueryClientProvider client={createTestQueryClient()}>
        <MessageItem message={message} conversation={mockConversation} />
      </QueryClientProvider>
    );

    // Should show only the newest content
    expect(screen.getByTestId('email-content')).toHaveTextContent('Latest reply here.');
    expect(screen.getByText(/Show quoted/i)).toBeInTheDocument();
  });
});