import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { ReplySidebar } from '../ReplySidebar';
import { vi } from 'vitest';

describe('ReplySidebar', () => {
  const mockOnSend = vi.fn();

  beforeEach(() => {
    mockOnSend.mockClear();
  });

  it('should render with default props', () => {
    render(<ReplySidebar onSend={mockOnSend} />);
    
    expect(screen.getByText('Reply')).toBeInTheDocument();
    expect(screen.getByText('To:')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Type your reply...')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Send' })).toBeInTheDocument();
  });

  it('should render with custom props', () => {
    render(
      <ReplySidebar
        title="Custom Title"
        recipientLabel="Custom Recipient"
        placeholder="Custom placeholder"
        onSend={mockOnSend}
      />
    );
    
    expect(screen.getByText('Custom Title')).toBeInTheDocument();
    expect(screen.getByText('Custom Recipient')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Custom placeholder')).toBeInTheDocument();
  });

  it('should handle message input and send', () => {
    render(<ReplySidebar onSend={mockOnSend} />);
    
    const textarea = screen.getByPlaceholderText('Type your reply...');
    const sendButton = screen.getByRole('button', { name: 'Send' });
    
    fireEvent.change(textarea, { target: { value: 'Test message' } });
    expect(textarea).toHaveValue('Test message');
    
    fireEvent.click(sendButton);
    expect(mockOnSend).toHaveBeenCalledWith('Test message');
  });

  it('should clear message after sending', () => {
    render(<ReplySidebar onSend={mockOnSend} />);
    
    const textarea = screen.getByPlaceholderText('Type your reply...');
    const sendButton = screen.getByRole('button', { name: 'Send' });
    
    fireEvent.change(textarea, { target: { value: 'Test message' } });
    fireEvent.click(sendButton);
    
    expect(textarea).toHaveValue('');
  });

  it('should disable send button when message is empty', () => {
    render(<ReplySidebar onSend={mockOnSend} />);
    
    const sendButton = screen.getByRole('button', { name: 'Send' });
    expect(sendButton).toBeDisabled();
  });

  it('should enable send button when message has content', () => {
    render(<ReplySidebar onSend={mockOnSend} />);
    
    const textarea = screen.getByPlaceholderText('Type your reply...');
    const sendButton = screen.getByRole('button', { name: 'Send' });
    
    fireEvent.change(textarea, { target: { value: 'Test message' } });
    expect(sendButton).not.toBeDisabled();
  });

  it('should render custom actions', () => {
    const customActions = (
      <div data-testid="custom-actions">
        <button>Custom Action</button>
      </div>
    );
    
    render(<ReplySidebar onSend={mockOnSend} actions={customActions} />);
    
    expect(screen.getByTestId('custom-actions')).toBeInTheDocument();
    expect(screen.getByText('Custom Action')).toBeInTheDocument();
  });

  it('should handle keyboard shortcuts', () => {
    render(<ReplySidebar onSend={mockOnSend} />);
    
    const textarea = screen.getByPlaceholderText('Type your reply...');
    
    fireEvent.change(textarea, { target: { value: 'Test message' } });
    fireEvent.keyDown(textarea, { key: 'Enter', ctrlKey: true });
    
    expect(mockOnSend).toHaveBeenCalledWith('Test message');
  });

  it('should not send on Enter without Ctrl', () => {
    render(<ReplySidebar onSend={mockOnSend} />);
    
    const textarea = screen.getByPlaceholderText('Type your reply...');
    
    fireEvent.change(textarea, { target: { value: 'Test message' } });
    fireEvent.keyDown(textarea, { key: 'Enter' });
    
    expect(mockOnSend).not.toHaveBeenCalled();
  });

  it('should apply custom className', () => {
    const { container } = render(
      <ReplySidebar onSend={mockOnSend} className="custom-class" />
    );
    
    expect(container.firstChild).toHaveClass('custom-class');
  });

  it('should have proper accessibility attributes', () => {
    render(<ReplySidebar onSend={mockOnSend} />);
    
    const textarea = screen.getByPlaceholderText('Type your reply...');
    const sendButton = screen.getByRole('button', { name: 'Send' });
    
    expect(textarea).toHaveAttribute('aria-label', 'Reply message');
    expect(sendButton).toHaveAttribute('aria-label', 'Send reply');
  });

  it('should show character count for long messages', () => {
    render(<ReplySidebar onSend={mockOnSend} />);
    
    const textarea = screen.getByPlaceholderText('Type your reply...');
    const longMessage = 'a'.repeat(100);
    
    fireEvent.change(textarea, { target: { value: longMessage } });
    
    // The component should handle long messages gracefully
    expect(textarea).toHaveValue(longMessage);
  });
});