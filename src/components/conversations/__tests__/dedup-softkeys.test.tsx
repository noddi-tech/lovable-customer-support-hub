import { describe, it, expect } from 'vitest';
import { deduplicateMessages, createContentHash, normalizeMessage, createNormalizationContext } from '@/lib/normalizeMessage';

const testNormalizationContext = createNormalizationContext({
  currentUserEmail: 'agent@test.com',
  agentEmails: ['agent@test.com'],
});

describe('Message Deduplication with Soft Keys', () => {
  it('deduplicates by primary ID', () => {
    const messages = [
      normalizeMessage({
        id: 'msg-1',
        content: 'Hello world',
        content_type: 'text/plain',
        sender_type: 'customer',
        sender_id: 'customer1',
        is_internal: false,
        attachments: null,
        created_at: '2024-01-01T10:00:00Z',
      }, testNormalizationContext),
      normalizeMessage({
        id: 'msg-1', // Same ID
        content: 'Hello world (duplicate)',
        content_type: 'text/plain',
        sender_type: 'customer',
        sender_id: 'customer1',
        is_internal: false,
        attachments: null,
        created_at: '2024-01-01T10:01:00Z',
      }, testNormalizationContext),
    ];

    const deduped = deduplicateMessages(messages);
    
    expect(deduped).toHaveLength(1);
    expect(deduped[0].id).toBe('msg-1');
    expect(deduped[0].visibleBody).toBe('Hello world');
  });

  it('deduplicates by soft key when same content from same sender on same day', () => {
    const messages = [
      normalizeMessage({
        id: 'msg-1',
        content: 'Identical message',
        content_type: 'text/plain',
        sender_type: 'customer',
        sender_id: 'customer1',
        is_internal: false,
        attachments: null,
        created_at: '2024-01-01T10:00:00Z',
        email_headers: { from: 'customer@example.com' },
      }, testNormalizationContext),
      normalizeMessage({
        id: 'msg-2', // Different ID
        content: 'Identical message', // Same content
        content_type: 'text/plain',
        sender_type: 'customer',
        sender_id: 'customer1',
        is_internal: false,
        attachments: null,
        created_at: '2024-01-01T11:00:00Z', // Same day, different time
        email_headers: { from: 'customer@example.com' }, // Same sender
      }, testNormalizationContext),
    ];

    const deduped = deduplicateMessages(messages);
    
    expect(deduped).toHaveLength(1);
    expect(deduped[0].id).toBe('msg-1'); // First occurrence wins
  });

  it('keeps messages with same content from different senders', () => {
    const messages = [
      normalizeMessage({
        id: 'msg-1',
        content: 'Same message text',
        content_type: 'text/plain',
        sender_type: 'customer',
        sender_id: 'customer1',
        is_internal: false,
        attachments: null,
        created_at: '2024-01-01T10:00:00Z',
        email_headers: { from: 'customer1@example.com' },
      }, testNormalizationContext),
      normalizeMessage({
        id: 'msg-2',
        content: 'Same message text',
        content_type: 'text/plain',
        sender_type: 'customer',
        sender_id: 'customer2',
        is_internal: false,
        attachments: null,
        created_at: '2024-01-01T10:00:00Z',
        email_headers: { from: 'customer2@example.com' }, // Different sender
      }, testNormalizationContext),
    ];

    const deduped = deduplicateMessages(messages);
    
    expect(deduped).toHaveLength(2);
    expect(deduped[0].from.email).toBe('customer1@example.com');
    expect(deduped[1].from.email).toBe('customer2@example.com');
  });

  it('keeps messages with same content from same sender on different days', () => {
    const messages = [
      normalizeMessage({
        id: 'msg-1',
        content: 'Daily message',
        content_type: 'text/plain',
        sender_type: 'customer',
        sender_id: 'customer1',
        is_internal: false,
        attachments: null,
        created_at: '2024-01-01T10:00:00Z',
        email_headers: { from: 'customer@example.com' },
      }, testNormalizationContext),
      normalizeMessage({
        id: 'msg-2',
        content: 'Daily message',
        content_type: 'text/plain',
        sender_type: 'customer',
        sender_id: 'customer1',
        is_internal: false,
        attachments: null,
        created_at: '2024-01-02T10:00:00Z', // Different day
        email_headers: { from: 'customer@example.com' },
      }, testNormalizationContext),
    ];

    const deduped = deduplicateMessages(messages);
    
    expect(deduped).toHaveLength(2);
  });

  it('maintains chronological order after deduplication', () => {
    const messages = [
      normalizeMessage({
        id: 'msg-3',
        content: 'Third message',
        content_type: 'text/plain',
        sender_type: 'customer',
        sender_id: 'customer1',
        is_internal: false,
        attachments: null,
        created_at: '2024-01-01T12:00:00Z',
      }, testNormalizationContext),
      normalizeMessage({
        id: 'msg-1',
        content: 'First message',
        content_type: 'text/plain',
        sender_type: 'customer',
        sender_id: 'customer1',
        is_internal: false,
        attachments: null,
        created_at: '2024-01-01T10:00:00Z',
      }, testNormalizationContext),
      normalizeMessage({
        id: 'msg-2',
        content: 'Second message',
        content_type: 'text/plain',
        sender_type: 'customer',
        sender_id: 'customer1',
        is_internal: false,
        attachments: null,
        created_at: '2024-01-01T11:00:00Z',
      }, testNormalizationContext),
    ];

    const deduped = deduplicateMessages(messages);
    
    expect(deduped).toHaveLength(3);
    expect(deduped[0].id).toBe('msg-1'); // Earliest
    expect(deduped[1].id).toBe('msg-2'); // Middle
    expect(deduped[2].id).toBe('msg-3'); // Latest
  });

  it('creates consistent content hashes', () => {
    const content1 = 'Hello world';
    const content2 = 'Hello world';
    const content3 = 'Hello World'; // Different case
    
    expect(createContentHash(content1)).toBe(createContentHash(content2));
    expect(createContentHash(content1)).not.toBe(createContentHash(content3));
  });
});