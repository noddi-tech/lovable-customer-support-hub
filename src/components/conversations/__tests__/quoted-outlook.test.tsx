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

describe('MessageCard - Outlook Quote Detection', () => {
  it('detects Outlook quoted content with border-top style', () => {
    const emailWithOutlookQuote = `<div>Thanks for reaching out.</div>
<div style="border-top:1px solid #ccc; margin-top:10px; padding-top:10px;">
<p><strong>From:</strong> John Doe &lt;john@example.com&gt;<br>
<strong>Sent:</strong> Thursday, January 4, 2024 3:30 PM<br>
<strong>To:</strong> support@company.com<br>
<strong>Subject:</strong> Need help with account</p>
<p>Hi, I need help with my account. Best regards, John</p>
</div>`;

    const message = normalizeMessage({
      id: 'test-msg',
      content: emailWithOutlookQuote,
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
    expect(screen.getByTestId('email-content')).toHaveTextContent('Thanks for reaching out.');
    
    // Should have quoted content available
    expect(message.quotedBlocks).toBeDefined();
    expect(message.quotedBlocks?.[0]?.kind).toBe('outlook');
    
    // Should show quoted history toggle
    expect(screen.getByText(/Show quoted history/i)).toBeInTheDocument();
  });

  it('detects plain text Outlook -----Original Message----- pattern', () => {
    const emailWithOriginalMessage = `Reply content here.

-----Original Message-----
From: John Doe [mailto:john@example.com]
Sent: Thursday, January 04, 2024 3:30 PM
To: support@company.com
Subject: Need help with account

Original message content
with multiple lines`;

    const message = normalizeMessage({
      id: 'test-msg',
      content: emailWithOriginalMessage,
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

    // Should show only the new content
    expect(screen.getByTestId('email-content')).toHaveTextContent('Reply content here.');
    
    // Should have quoted content available
    expect(message.quotedBlocks).toBeDefined();
    expect(message.quotedBlocks?.[0]?.kind).toBe('header');
    
    // Should show quoted history toggle
    expect(screen.getByText(/Show quoted history/i)).toBeInTheDocument();
  });
});