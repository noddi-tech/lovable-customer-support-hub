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

describe('MessageCard - Norwegian Quote Detection', () => {
  it('detects Norwegian "Den ... skrev:" pattern', () => {
    const emailWithNorwegianQuote = `Takk for meldingen din.

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
        <MessageCard message={message} conversation={mockConversation} defaultCollapsed={false} />
      </QueryClientProvider>
    );

    // Should show only the new content
    expect(screen.getByTestId('email-content')).toHaveTextContent('Takk for meldingen din.');
    
    // Should have quoted content available
    expect(message.quotedBlocks).toBeDefined();
    expect(message.quotedBlocks?.[0]?.kind).toBe('header');
    
    // Should show quoted history toggle
    expect(screen.getByText(/Show quoted history/i)).toBeInTheDocument();
  });

  it('detects Norwegian "På ... skrev:" pattern', () => {
    const emailWithNorwegianQuote = `Hei igjen!

På 4. januar 2024 skrev Kari Nordmann <kari@example.com>:
> Hei,
> 
> Kan dere hjelpe meg med dette?`;

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
        <MessageCard message={message} conversation={mockConversation} defaultCollapsed={false} />
      </QueryClientProvider>
    );

    // Should show only the new content
    expect(screen.getByTestId('email-content')).toHaveTextContent('Hei igjen!');
    
    // Should have quoted content available
    expect(message.quotedBlocks).toBeDefined();
    expect(message.quotedBlocks?.[0]?.kind).toBe('header');
    
    // Should show quoted history toggle
    expect(screen.getByText(/Show quoted history/i)).toBeInTheDocument();
  });
});