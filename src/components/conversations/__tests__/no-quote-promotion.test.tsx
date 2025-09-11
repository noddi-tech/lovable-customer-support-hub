import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { vi, describe, it, expect } from 'vitest';
import { ProgressiveMessagesList } from '../ProgressiveMessagesList';
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

vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({ user: { email: 'agent@test.com' } }),
}));

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: () => ({
      select: () => ({
        eq: () => ({
          order: () => ({
            limit: () => ({
              lt: () => Promise.resolve({ data: [], error: null })
            })
          })
        })
      })
    })
  }
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

describe('No Quote Promotion', () => {
  it('never promotes quoted blocks to separate cards', () => {
    const emailWithMultipleQuotes = `<div>Latest reply from agent</div>
<div class="gmail_quote">
<div>On Thu, Jan 4, 2024 at 3:30 PM Customer &lt;<a href="mailto:customer@example.com">customer@example.com</a>&gt; wrote:<br></div>
<blockquote>
<div>Customer response here</div>
</blockquote>
</div>
<div class="gmail_quote">
<div>On Wed, Jan 3, 2024 at 2:30 PM Agent &lt;<a href="mailto:agent@test.com">agent@test.com</a>&gt; wrote:<br></div>
<blockquote>
<div>Original agent message</div>
</blockquote>
</div>`;

    const message = normalizeMessage({
      id: 'test-msg',
      content: emailWithMultipleQuotes,
      content_type: 'text/html',
      sender_type: 'agent',
      sender_id: 'agent1',
      is_internal: false,
      attachments: null,
      created_at: '2024-01-04T16:30:00Z',
    }, testNormalizationContext);

    // Should have quoted blocks but not be segmented into cards
    expect(message.quotedBlocks).toBeDefined();
    expect(message.quotedBlocks!.length).toBe(2);
    
    // The visible body should not contain quoted content
    expect(message.visibleBody).toContain('Latest reply from agent');
    expect(message.visibleBody).not.toContain('Customer response here');
    expect(message.visibleBody).not.toContain('Original agent message');
  });
});