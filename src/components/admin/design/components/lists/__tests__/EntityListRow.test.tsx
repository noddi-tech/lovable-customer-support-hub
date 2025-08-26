import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { EntityListRow } from '../EntityListRow';

describe('EntityListRow', () => {
  const mockProps = {
    subject: 'Test Subject',
    preview: 'This is a preview of the content',
    onClick: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Basic Rendering', () => {
    it('renders subject and preview text', () => {
      render(<EntityListRow {...mockProps} />);
      
      expect(screen.getByText('Test Subject')).toBeInTheDocument();
      expect(screen.getByText('This is a preview of the content')).toBeInTheDocument();
    });

    it('renders without preview', () => {
      render(<EntityListRow subject="Just Subject" onClick={mockProps.onClick} />);
      
      expect(screen.getByText('Just Subject')).toBeInTheDocument();
    });

    it('renders with avatar', () => {
      render(
        <EntityListRow 
          {...mockProps}
          avatar={{ fallback: 'JS', alt: 'John Smith' }}
        />
      );
      
      const avatar = screen.getByText('JS');
      expect(avatar).toBeInTheDocument();
    });

    it('renders with custom leading element', () => {
      render(
        <EntityListRow 
          {...mockProps}
          leading={<div data-testid="custom-icon">Icon</div>}
        />
      );
      
      expect(screen.getByTestId('custom-icon')).toBeInTheDocument();
    });
  });

  describe('Badges and Meta', () => {
    it('renders badges correctly', () => {
      render(
        <EntityListRow 
          {...mockProps}
          badges={[
            { label: 'Unread', variant: 'default' },
            { label: 'High', variant: 'destructive' }
          ]}
        />
      );
      
      expect(screen.getByText('Unread')).toBeInTheDocument();
      expect(screen.getByText('High')).toBeInTheDocument();
    });

    it('limits badges display and shows overflow count', () => {
      render(
        <EntityListRow 
          {...mockProps}
          badges={[
            { label: 'Badge1', variant: 'default' },
            { label: 'Badge2', variant: 'secondary' },
            { label: 'Badge3', variant: 'outline' }
          ]}
        />
      );
      
      expect(screen.getByText('Badge1')).toBeInTheDocument();
      expect(screen.getByText('Badge2')).toBeInTheDocument();
      expect(screen.getByText('+1')).toBeInTheDocument();
    });

    it('renders meta information', () => {
      render(
        <EntityListRow 
          {...mockProps}
          meta={[
            { label: 'From', value: 'John Doe' },
            { label: 'Time', value: '2 hours ago' }
          ]}
        />
      );
      
      expect(screen.getByText('From:')).toBeInTheDocument();
      expect(screen.getByText('John Doe')).toBeInTheDocument();
      expect(screen.getByText('Time:')).toBeInTheDocument();
      expect(screen.getByText('2 hours ago')).toBeInTheDocument();
    });
  });

  describe('Interaction', () => {
    it('handles click events', () => {
      render(<EntityListRow {...mockProps} />);
      
      const button = screen.getByRole('button');
      fireEvent.click(button);
      
      expect(mockProps.onClick).toHaveBeenCalledTimes(1);
    });

    it('handles keyboard navigation', () => {
      render(<EntityListRow {...mockProps} />);
      
      const button = screen.getByRole('button');
      
      // Test Enter key
      fireEvent.keyDown(button, { key: 'Enter' });
      expect(mockProps.onClick).toHaveBeenCalledTimes(1);
      
      // Test Space key
      fireEvent.keyDown(button, { key: ' ' });
      expect(mockProps.onClick).toHaveBeenCalledTimes(2);
      
      // Test other keys (should not trigger)
      fireEvent.keyDown(button, { key: 'a' });
      expect(mockProps.onClick).toHaveBeenCalledTimes(2);
    });

    it('renders as link when href provided', () => {
      render(<EntityListRow {...mockProps} href="/conversation/123" />);
      
      const link = screen.getByRole('link');
      expect(link).toHaveAttribute('href', '/conversation/123');
    });
  });

  describe('Selected State', () => {
    it('applies selected styling', () => {
      render(<EntityListRow {...mockProps} selected={true} />);
      
      const button = screen.getByRole('button');
      expect(button).toHaveClass('ring-2', 'ring-ring');
    });

    it('applies default styling when not selected', () => {
      render(<EntityListRow {...mockProps} selected={false} />);
      
      const button = screen.getByRole('button');
      expect(button).toHaveClass('border-border');
      expect(button).not.toHaveClass('ring-2');
    });
  });

  describe('Accessibility', () => {
    it('has proper aria-label', () => {
      render(<EntityListRow {...mockProps} />);
      
      const button = screen.getByRole('button');
      expect(button).toHaveAttribute('aria-label', 'Test Subject: This is a preview of the content');
    });

    it('accepts custom aria-label', () => {
      render(
        <EntityListRow 
          {...mockProps} 
          aria-label="Custom label"
        />
      );
      
      const button = screen.getByRole('button');
      expect(button).toHaveAttribute('aria-label', 'Custom label');
    });

    it('has focus styles', () => {
      render(<EntityListRow {...mockProps} />);
      
      const button = screen.getByRole('button');
      fireEvent.focus(button);
      
      expect(button).toHaveClass('focus-visible:ring-2');
    });

    it('supports aria-describedby', () => {
      render(
        <EntityListRow 
          {...mockProps}
          aria-describedby="description-id"
        />
      );
      
      const button = screen.getByRole('button');
      expect(button).toHaveAttribute('aria-describedby', 'description-id');
    });
  });

  describe('Custom Styling', () => {
    it('accepts custom className', () => {
      render(<EntityListRow {...mockProps} className="custom-class" />);
      
      const button = screen.getByRole('button');
      expect(button).toHaveClass('custom-class');
    });

    it('accepts custom contentClassName', () => {
      render(<EntityListRow {...mockProps} contentClassName="custom-content" />);
      
      const button = screen.getByRole('button');
      const contentDiv = button.querySelector('.custom-content');
      expect(contentDiv).toBeInTheDocument();
    });
  });
});