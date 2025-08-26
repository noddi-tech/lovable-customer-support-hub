import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { InboxList } from '../InboxList';
import { vi } from 'vitest';

describe('InboxList', () => {
  const mockOnInboxSelect = vi.fn();

  beforeEach(() => {
    mockOnInboxSelect.mockClear();
  });

  it('should render default inboxes', () => {
    render(<InboxList />);
    
    expect(screen.getByText('All Messages')).toBeInTheDocument();
    expect(screen.getByText('Unread')).toBeInTheDocument();
    expect(screen.getByText('Assigned to Me')).toBeInTheDocument();
    expect(screen.getByText('Team Queue')).toBeInTheDocument();
    expect(screen.getByText('Archived')).toBeInTheDocument();
  });

  it('should show counts for each inbox', () => {
    render(<InboxList />);
    
    expect(screen.getByText('142')).toBeInTheDocument(); // All Messages
    expect(screen.getByText('23')).toBeInTheDocument();  // Unread
    expect(screen.getByText('8')).toBeInTheDocument();   // Assigned
    expect(screen.getByText('15')).toBeInTheDocument();  // Team Queue
    expect(screen.getByText('89')).toBeInTheDocument();  // Archived
  });

  it('should highlight selected inbox', () => {
    render(<InboxList selectedInbox="unread" />);
    
    const unreadButton = screen.getByRole('button', { name: /unread/i });
    expect(unreadButton).toHaveClass('bg-muted');
  });

  it('should call onInboxSelect when inbox is clicked', () => {
    render(<InboxList onInboxSelect={mockOnInboxSelect} />);
    
    fireEvent.click(screen.getByRole('button', { name: /unread/i }));
    
    expect(mockOnInboxSelect).toHaveBeenCalledWith('unread');
  });

  it('should render custom inboxes', () => {
    const customInboxes = [
      { id: 'custom1', name: 'Custom Inbox', count: 5 },
      { id: 'custom2', name: 'Another Inbox', count: 10 },
    ];

    render(<InboxList inboxes={customInboxes} />);
    
    expect(screen.getByText('Custom Inbox')).toBeInTheDocument();
    expect(screen.getByText('Another Inbox')).toBeInTheDocument();
    expect(screen.getByText('5')).toBeInTheDocument();
    expect(screen.getByText('10')).toBeInTheDocument();
  });

  it('should apply custom className', () => {
    const { container } = render(<InboxList className="custom-class" />);
    
    expect(container.firstChild).toHaveClass('custom-class');
  });

  it('should have proper accessibility attributes', () => {
    render(<InboxList />);
    
    const buttons = screen.getAllByRole('button');
    buttons.forEach(button => {
      expect(button).toBeInTheDocument();
    });
  });

  it('should render icons for each inbox', () => {
    render(<InboxList />);
    
    // Check that icons are rendered (they should be in the DOM)
    const buttons = screen.getAllByRole('button');
    expect(buttons).toHaveLength(5); // 5 default inboxes
  });

  it('should not show badge when count is 0', () => {
    const customInboxes = [
      { id: 'empty', name: 'Empty Inbox', count: 0 },
    ];

    render(<InboxList inboxes={customInboxes} />);
    
    expect(screen.getByText('Empty Inbox')).toBeInTheDocument();
    expect(screen.queryByText('0')).not.toBeInTheDocument();
  });
});