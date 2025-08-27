import React from 'react';
import { render } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router-dom';
import { vi, describe, test, expect, beforeEach } from 'vitest';
import { MasterDetailShell } from '@/components/admin/design/components/layouts/MasterDetailShell';

const createTestWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });

  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        {children}
      </BrowserRouter>
    </QueryClientProvider>
  );
};

describe('MasterDetailShell Single Right Rail', () => {
  test('detail view has exactly two panes', () => {
    const { container } = render(
      <MasterDetailShell
        detailLeft={<div data-testid="message-thread">Message Thread</div>}
        detailRight={<div data-testid="reply-sidebar">Reply Sidebar</div>}
        isDetail={true}
        onBack={vi.fn()}
        backButtonLabel="Back to Inbox"
      />,
      { wrapper: createTestWrapper() }
    );

    // Find the detail grid container  
    const detailGrid = container.querySelector('[data-testid="detail-grid"]');
    expect(detailGrid).toBeDefined();
    
    // Assert exactly 2 children: message thread (left) + ReplySidebar (right)
    expect(detailGrid?.childElementCount).toBe(2);
  });

  test('list view has correct two-column layout', () => {
    const { container } = render(
      <MasterDetailShell
        left={<div data-testid="inbox-list">Inbox List</div>}
        center={<div data-testid="conversation-list">Conversation List</div>}
        isDetail={false}
        onBack={vi.fn()}
        backButtonLabel="Back to Inbox"
      />,
      { wrapper: createTestWrapper() }
    );

    // Should not have detail grid in list mode
    const detailGrid = container.querySelector('[data-testid="detail-grid"]');
    expect(detailGrid).toBeNull();
    
    // Should have both left and center panes
    const inboxList = container.querySelector('[data-testid="inbox-list"]');
    const conversationList = container.querySelector('[data-testid="conversation-list"]');
    expect(inboxList).toBeDefined();
    expect(conversationList).toBeDefined();
  });

  test('no extra sidebars or duplicate content should exist', () => {
    const { container } = render(
      <MasterDetailShell
        detailLeft={<div>Message Thread</div>}
        detailRight={
          <div data-testid="reply-sidebar">
            <h3>Conversation Details</h3>
            <h3>Quick Actions</h3>
            <h3>Reply</h3>
          </div>
        }
        isDetail={true}
        onBack={vi.fn()}
        backButtonLabel="Back to Inbox"
      />,
      { wrapper: createTestWrapper() }
    );

    // Ensure we only have one occurrence of key UI elements
    const conversationDetailsNodes = Array.from(
      container.querySelectorAll('*')
    ).filter(node => 
      node.textContent?.includes('Conversation Details')
    );
    
    const quickActionsNodes = Array.from(
      container.querySelectorAll('*')
    ).filter(node => 
      node.textContent?.includes('Quick Actions')
    );

    // Should only find these once in the ReplySidebar
    expect(conversationDetailsNodes.length).toBeLessThanOrEqual(2); // Parent + child element
    expect(quickActionsNodes.length).toBeLessThanOrEqual(2); // Parent + child element
  });
});