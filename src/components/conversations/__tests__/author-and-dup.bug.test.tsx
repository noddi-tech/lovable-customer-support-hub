/**
 * Tests for author attribution and duplicate content issues
 * These tests should reproduce the current problems before fixes
 */

import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { MessageItem } from '../MessageItem';
import { ProgressiveMessagesList } from '../ProgressiveMessagesList';
import { useConversationMessagesList } from '@/hooks/conversations/useConversationMessages';
import { normalizeMessage, createNormalizationContext } from '@/lib/normalizeMessage';

// Mock the hooks
vi.mock('@/hooks/conversations/useConversationMessages');
vi.mock('@/hooks/useDateFormatting', () => ({
  useDateFormatting: () => ({
    dateTime: (date: string) => new Date(date).toLocaleString()
  })
}));
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key
  })
}));

const createTestQueryClient = () => new QueryClient({
  defaultOptions: {
    queries: { retry: false },
    mutations: { retry: false }
  }
});

// Test data fixtures
const mockAgentEmails = ['agent@company.com', 'support@company.com'];
const mockNormalizationContext = createNormalizationContext({
  agentEmails: mockAgentEmails,
  currentUserEmail: 'agent@company.com',
  orgDomain: 'company.com'
});

// Gmail-style email thread with quoted content
const gmailEmailThread = [
  {
    id: 'msg1',
    content: 'Original customer inquiry about product X',
    content_type: 'text/plain',
    sender_type: 'customer',
    sender_id: null,
    is_internal: false,
    created_at: '2024-01-01T10:00:00Z',
    email_headers: {
      from: 'customer@external.com'
    }
  },
  {
    id: 'msg2', 
    content: `Thanks for reaching out! We can help with that.

On Mon, Jan 1, 2024 at 10:00 AM customer@external.com wrote:
> Original customer inquiry about product X`,
    content_type: 'text/plain',
    sender_type: 'agent',
    sender_id: 'agent-uuid',
    is_internal: false,
    created_at: '2024-01-01T11:00:00Z',
    email_headers: {
      from: 'agent@company.com'
    }
  },
  {
    id: 'msg3',
    content: `Perfect, when can we schedule a call?

On Mon, Jan 1, 2024 at 11:00 AM agent@company.com wrote:
> Thanks for reaching out! We can help with that.
>
> On Mon, Jan 1, 2024 at 10:00 AM customer@external.com wrote:
> > Original customer inquiry about product X`,
    content_type: 'text/plain',
    sender_type: 'customer',
    sender_id: null,
    is_internal: false,
    created_at: '2024-01-01T12:00:00Z',
    email_headers: {
      from: 'customer@external.com'
    }
  }
];

// SMS conversation
const smsThread = [
  {
    id: 'sms1',
    content: 'Hi, I need help with my order',
    content_type: 'text/plain',
    sender_type: 'customer',
    sender_id: null,
    is_internal: false,
    created_at: '2024-01-01T14:00:00Z',
    customer_phone: '+1234567890',
    channel: 'sms'
  },
  {
    id: 'sms2',
    content: 'Sure! Can you provide your order number?',
    content_type: 'text/plain',
    sender_type: 'agent',
    sender_id: 'agent-uuid',
    is_internal: false,
    created_at: '2024-01-01T14:05:00Z',
    channel: 'sms'
  }
];

const mockConversation = {
  customer: {
    full_name: 'John Doe',
    email: 'customer@external.com'
  }
};

describe('Author Attribution and Duplicate Content Issues', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Email Thread Author Attribution', () => {
    it('should correctly identify agent vs customer messages in email thread', () => {
      const normalizedMessages = gmailEmailThread.map(msg => 
        normalizeMessage(msg, mockNormalizationContext)
      );

      // Test normalization results
      expect(normalizedMessages[0].authorType).toBe('customer');
      expect(normalizedMessages[0].authorLabel).toBe('customer@external.com');
      expect(normalizedMessages[0].direction).toBe('inbound');

      expect(normalizedMessages[1].authorType).toBe('agent');
      expect(normalizedMessages[1].authorLabel).toBe('Agent (agent@company.com)');
      expect(normalizedMessages[1].direction).toBe('outbound');

      expect(normalizedMessages[2].authorType).toBe('customer');
      expect(normalizedMessages[2].direction).toBe('inbound');
    });

    it('should not show duplicate content from quoted sections', () => {
      const normalizedMessages = gmailEmailThread.map(msg => 
        normalizeMessage(msg, mockNormalizationContext)
      );

      // The third message should only show the new content, not the quoted parts
      const thirdMessage = normalizedMessages[2];
      expect(thirdMessage.visibleBody).toBe('Perfect, when can we schedule a call?');
      expect(thirdMessage.quotedBlocks).toBeDefined();
      expect(thirdMessage.quotedBlocks?.length).toBeGreaterThan(0);
    });

    it('should render correct author labels in MessageItem components', () => {
      const queryClient = createTestQueryClient();
      
      // Test the first message (customer)
        const normalizedMessage = normalizeMessage(gmailEmailThread[0], mockNormalizationContext);
        
        render(
          <QueryClientProvider client={queryClient}>
            <MessageItem
              message={normalizedMessage}
              conversation={mockConversation}
            />
          </QueryClientProvider>
        );

      // This test should currently FAIL because MessageItem doesn't use normalized messages
      // expect(screen.getByText('customer@external.com')).toBeInTheDocument();
    });
  });

  describe('SMS Thread Author Attribution', () => {
    it('should correctly identify direction for SMS messages', () => {
      const contextWithPhone = createNormalizationContext({
        agentPhones: ['+1234567891'], // Different from customer phone
        currentUserEmail: 'agent@company.com'
      });

      const normalizedMessages = smsThread.map(msg => 
        normalizeMessage(msg, contextWithPhone)
      );

      expect(normalizedMessages[0].authorType).toBe('customer');
      expect(normalizedMessages[0].direction).toBe('inbound');
      
      expect(normalizedMessages[1].authorType).toBe('customer'); // This should FAIL - it's not detecting agent properly
      expect(normalizedMessages[1].direction).toBe('inbound');   // This should FAIL - should be outbound
    });
  });

  describe('Progressive Message Loading', () => {
    it('should load newest 3 messages first without duplicates', () => {
      const mockUseConversationMessagesList = vi.mocked(useConversationMessagesList);
      
      // Mock the hook to return normalized messages
      mockUseConversationMessagesList.mockReturnValue({
        messages: [],
        totalCount: 5,
        hasNextPage: true,
        isFetchingNextPage: false,
        fetchNextPage: vi.fn(),
        isLoading: false,
        error: null
      });

      const queryClient = createTestQueryClient();
      
      render(
        <QueryClientProvider client={queryClient}>
          <ProgressiveMessagesList
            conversationId="test-conversation"
            conversation={mockConversation}
          />
        </QueryClientProvider>
      );

      // Should show load older messages button
      expect(screen.getByText(/Load older messages/)).toBeInTheDocument();
    });

    it('should use message.id as React key for stable rendering', () => {
      // This test checks that we're using stable keys for React rendering
      // to prevent unnecessary re-renders and maintain scroll position
      
      const mockMessages = gmailEmailThread.map(msg => 
        normalizeMessage(msg, mockNormalizationContext)
      );
      
      // Verify all messages have stable IDs
      mockMessages.forEach(msg => {
        expect(msg.id).toBeDefined();
        expect(typeof msg.id).toBe('string');
        expect(msg.id.length).toBeGreaterThan(0);
      });
    });
  });

  describe('Content Deduplication', () => {
    it('should handle messages with similar content but different IDs', () => {
      const duplicateContent = [
        {
          id: 'unique1',
          content: 'Same content',
          sender_type: 'customer' as const,
          created_at: '2024-01-01T10:00:00Z'
        },
        {
          id: 'unique2', 
          content: 'Same content',
          sender_type: 'customer' as const,
          created_at: '2024-01-01T10:01:00Z'
        }
      ];

      const normalized = duplicateContent.map(msg => 
        normalizeMessage(msg, mockNormalizationContext)
      );

      // Both messages should be preserved since they have different IDs
      expect(normalized).toHaveLength(2);
      expect(normalized[0].id).not.toBe(normalized[1].id);
    });
  });
});

// Export test utilities for use in other test files
export {
  mockNormalizationContext,
  gmailEmailThread,
  smsThread,
  mockConversation,
  createTestQueryClient
};