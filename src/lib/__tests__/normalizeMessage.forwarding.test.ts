import { describe, it, expect, beforeEach, vi } from 'vitest';

// Mock logger before imports
vi.mock('@/utils/logger', () => ({
  logger: new Proxy({}, {
    get: () => vi.fn(),
  }),
}));

import { normalizeMessage, createNormalizationContext, type NormalizationContext } from '../normalizeMessage';

describe('normalizeMessage - Google Groups forwarding detection', () => {
  let ctx: NormalizationContext;

  beforeEach(() => {
    ctx = createNormalizationContext({
      agentEmails: ['agent@noddi.no'],
      agentDomains: ['noddi.no'],
      orgDomains: ['noddi.no'],
      inboxEmail: 'hei@inbound.noddi.no',
      conversationCustomerEmail: 'customer@example.com',
      conversationCustomerName: 'Test Customer',
    });
  });

  it('detects forwarded agent copy via Reply-To header in raw format', () => {
    // From is an external group address, Reply-To reveals agent
    const raw = {
      id: 'msg-1',
      content: '<p>Hello from agent</p>',
      content_type: 'text/html',
      sender_type: 'customer',
      is_internal: false,
      created_at: '2026-03-27T10:00:00Z',
      email_headers: {
        raw: 'From: group@googlegroups.com\nReply-To: agent@noddi.no\nTo: customer@example.com\nSubject: Re: Test',
      },
    };

    const result = normalizeMessage(raw, ctx);
    expect(result.authorType).toBe('agent');
    expect(result.direction).toBe('outbound');
    expect(result.from.email).toBe('agent@noddi.no');
  });

  it('detects forwarded agent copy via X-Original-From header', () => {
    const raw = {
      id: 'msg-2',
      content: '<p>Hello from agent</p>',
      content_type: 'text/html',
      sender_type: 'customer',
      is_internal: false,
      created_at: '2026-03-27T10:00:00Z',
      email_headers: {
        raw: 'From: group@googlegroups.com\nX-Original-From: agent@noddi.no\nTo: customer@example.com',
      },
    };

    const result = normalizeMessage(raw, ctx);
    expect(result.authorType).toBe('agent');
    expect(result.direction).toBe('outbound');
  });

  it('detects "via" pattern in From with agent Reply-To', () => {
    const raw = {
      id: 'msg-3',
      content: '<p>Hello from agent</p>',
      content_type: 'text/html',
      sender_type: 'customer',
      is_internal: false,
      created_at: '2026-03-27T10:00:00Z',
      email_headers: {
        raw: 'From: "Agent via GroupName" <group@googlegroups.com>\nReply-To: agent@noddi.no\nTo: customer@example.com',
      },
    };

    const result = normalizeMessage(raw, ctx);
    expect(result.authorType).toBe('agent');
    expect(result.direction).toBe('outbound');
  });

  it('does NOT misclassify real customer messages as agent', () => {
    const raw = {
      id: 'msg-4',
      content: '<p>Hello from customer</p>',
      content_type: 'text/html',
      sender_type: 'customer',
      is_internal: false,
      created_at: '2026-03-27T10:00:00Z',
      email_headers: {
        raw: 'From: customer@example.com\nTo: hei@noddi.no\nSubject: Question',
      },
    };

    const result = normalizeMessage(raw, ctx);
    expect(result.authorType).toBe('customer');
    expect(result.direction).toBe('inbound');
  });

  it('does NOT flip when Reply-To is a non-agent email', () => {
    const raw = {
      id: 'msg-5',
      content: '<p>Hello</p>',
      content_type: 'text/html',
      sender_type: 'customer',
      is_internal: false,
      created_at: '2026-03-27T10:00:00Z',
      email_headers: {
        raw: 'From: group@googlegroups.com\nReply-To: other-customer@gmail.com\nTo: hei@noddi.no',
      },
    };

    const result = normalizeMessage(raw, ctx);
    expect(result.authorType).toBe('customer');
    expect(result.direction).toBe('inbound');
  });
});
