import { render, screen } from '@testing-library/react';
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

describe('MessageItem - Outlook Quote Collapse', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('collapses Outlook-style quoted content', () => {
    const emailWithOutlookQuote = `Thank you for your inquiry.

We will get back to you shortly.

-----Original Message-----
From: customer@example.com
Sent: Thursday, January 4, 2024 3:30 PM
To: support@company.com
Subject: Account Issue

Hello,

I'm having trouble with my account login.

Best regards,
Customer`;

    const message = normalizeMessage({
      id: 'test-msg',
      content: emailWithOutlookQuote,
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

    // Should show only the new content
    const emailContent = screen.getByTestId('email-content');
    expect(emailContent).toHaveTextContent('Thank you for your inquiry.\n\nWe will get back to you shortly.');
    expect(emailContent).not.toHaveTextContent('-----Original Message-----');
    
    // Should have toggle for quoted content
    expect(screen.getByText(/Show quoted/i)).toBeInTheDocument();
  });

  it('handles email headers pattern', () => {
    const emailWithHeaders = `Reply to your message below.

From: customer@example.com
Sent: Thursday, January 4, 2024 3:30 PM
To: support@company.com
Subject: Re: Account Issue

Original message content here.`;

    const message = normalizeMessage({
      id: 'test-msg',
      content: emailWithHeaders,
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

    // Should collapse at the From: header
    expect(screen.getByTestId('email-content')).toHaveTextContent('Reply to your message below.');
    expect(screen.getByText(/Show quoted/i)).toBeInTheDocument();
  });

  it('handles HTML Outlook quotes with div borders', () => {
    const htmlWithOutlookQuote = `<div>New response here.</div>
<div style="border-top: 1px solid #ccc; padding-top: 10px;">
<p><strong>From:</strong> customer@example.com</p>
<p><strong>Sent:</strong> Thursday, January 4, 2024 3:30 PM</p>
<p>Original message content</p>
</div>`;

    const message = normalizeMessage({
      id: 'test-msg',
      content: htmlWithOutlookQuote,
      content_type: 'text/html',
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

    // Should show only the new content
    expect(screen.getByText(/Show quoted/i)).toBeInTheDocument();
  });

  it('handles separator lines', () => {
    const emailWithSeparator = `Thanks for the update.

_________________________________
From: customer@example.com
Date: Thursday, January 4, 2024
Subject: Account Update

Previous message content here.`;

    const message = normalizeMessage({
      id: 'test-msg',
      content: emailWithSeparator,
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

    // Should collapse at the separator line
    expect(screen.getByTestId('email-content')).toHaveTextContent('Thanks for the update.');
    expect(screen.getByText(/Show quoted/i)).toBeInTheDocument();
  });
});