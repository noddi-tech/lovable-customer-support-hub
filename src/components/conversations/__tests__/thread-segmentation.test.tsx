import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { vi, describe, it, expect } from 'vitest';
import { ProgressiveMessagesList } from '../ProgressiveMessagesList';
import { normalizeMessage, createNormalizationContext } from '@/lib/normalizeMessage';
import { segmentMessageIntoCards } from '@/lib/segmentThread';

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

describe('Thread Segmentation', () => {
  it('segments one message with quoted replies into multiple cards', () => {
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

    const cards = segmentMessageIntoCards(message, {
      agentEmails: ['agent@test.com'],
      currentUserEmail: 'agent@test.com',
    });

    // Should have original message + 2 quoted messages = 3 cards total
    expect(cards).toHaveLength(3);
    
    // First card should be the latest (original message)
    expect(cards[0].id).toBe('test-msg');
    expect(cards[0].authorType).toBe('agent');
    
    // Second and third should be synthetic quoted cards
    expect(cards[1].id).toBe('test-msg::q0');
    expect(cards[1].originalMessage?._syntheticQuoted).toBe(true);
    
    expect(cards[2].id).toBe('test-msg::q1');
    expect(cards[2].originalMessage?._syntheticQuoted).toBe(true);
    
    // Cards should be in DESC order (newest first)
    const timestamps = cards.map(c => new Date(c.createdAt).getTime());
    for (let i = 1; i < timestamps.length; i++) {
      expect(timestamps[i-1]).toBeGreaterThanOrEqual(timestamps[i]);
    }
  });

  it('properly identifies agent vs customer in quoted messages', () => {
    const emailWithMixedSenders = `<div>Agent reply</div>
<div class="gmail_quote">
<div>On Thu, Jan 4, 2024 at 3:30 PM customer@example.com wrote:<br></div>
<blockquote><div>Customer message</div></blockquote>
</div>
<div class="gmail_quote">
<div>On Wed, Jan 3, 2024 at 2:30 PM agent@test.com wrote:<br></div>
<blockquote><div>Original agent message</div></blockquote>
</div>`;

    const message = normalizeMessage({
      id: 'test-msg',
      content: emailWithMixedSenders,
      content_type: 'text/html',
      sender_type: 'agent',
      sender_id: 'agent1',
      is_internal: false,
      attachments: null,
      created_at: '2024-01-04T16:30:00Z',
    }, testNormalizationContext);

    const cards = segmentMessageIntoCards(message, {
      agentEmails: ['agent@test.com'],
      currentUserEmail: 'agent@test.com',
    });

    expect(cards).toHaveLength(3);
    
    // Original message - agent
    expect(cards[0].authorType).toBe('agent');
    
    // First quoted - customer
    expect(cards[1].authorType).toBe('customer');
    
    // Second quoted - agent
    expect(cards[2].authorType).toBe('agent');
  });
});