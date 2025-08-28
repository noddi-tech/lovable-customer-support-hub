import { render, screen } from '@testing-library/react';
import { SafeTabsWrapper, SafeToolbar } from '../SafeTabsWrapper';
import { Button } from '../button';

describe('SafeTabsWrapper', () => {
  const mockTabs = [
    { value: 'tab1', label: 'Tab 1' },
    { value: 'tab2', label: 'Tab 2' },
    { value: 'tab3', label: 'Tab 3' },
  ];

  it('renders with flex-wrap by default', () => {
    render(<SafeTabsWrapper tabs={mockTabs} />);
    
    const tabsList = screen.getByRole('tablist');
    expect(tabsList).toHaveClass('flex-wrap');
  });

  it('applies correct spacing classes', () => {
    render(<SafeTabsWrapper tabs={mockTabs} spacing="loose" />);
    
    const tabsList = screen.getByRole('tablist');
    expect(tabsList).toHaveClass('mb-4');
  });

  it('prevents whitespace-nowrap issues with truncate', () => {
    render(<SafeTabsWrapper tabs={mockTabs} />);
    
    const tabs = screen.getAllByRole('tab');
    tabs.forEach(tab => {
      expect(tab).toHaveClass('truncate', 'min-w-0');
    });
  });

  it('can disable wrapping when needed', () => {
    render(<SafeTabsWrapper tabs={mockTabs} wrap={false} />);
    
    const tabsList = screen.getByRole('tablist');
    expect(tabsList).not.toHaveClass('flex-wrap');
  });
});

describe('SafeToolbar', () => {
  it('renders with flex-wrap by default', () => {
    const { container } = render(
      <SafeToolbar>
        <Button>Action 1</Button>
        <Button>Action 2</Button>
      </SafeToolbar>
    );
    
    const toolbar = container.firstChild as HTMLElement;
    expect(toolbar).toHaveClass('flex-wrap', 'min-w-0');
  });

  it('applies correct spacing and justify classes', () => {
    const { container } = render(
      <SafeToolbar spacing="loose" justify="between">
        <Button>Left</Button>
        <Button>Right</Button>
      </SafeToolbar>
    );
    
    const toolbar = container.firstChild as HTMLElement;
    expect(toolbar).toHaveClass('gap-4', 'justify-between');
  });

  it('can disable wrapping when needed', () => {
    const { container } = render(
      <SafeToolbar wrap={false}>
        <Button>Action</Button>
      </SafeToolbar>
    );
    
    const toolbar = container.firstChild as HTMLElement;
    expect(toolbar).not.toHaveClass('flex-wrap');
  });
});