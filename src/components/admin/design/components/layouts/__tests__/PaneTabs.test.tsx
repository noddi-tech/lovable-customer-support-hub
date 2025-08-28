import { render, screen } from '@testing-library/react';
import { PaneTabs, SafeTabsList } from '../PaneTabs';
import { Tabs, TabsTrigger } from '@/components/ui/tabs';

describe('PaneTabs', () => {
  it('renders tabs and content with proper structure', () => {
    const tabs = (
      <Tabs defaultValue="tab1">
        <SafeTabsList>
          <TabsTrigger value="tab1">Tab 1</TabsTrigger>
          <TabsTrigger value="tab2">Tab 2</TabsTrigger>
        </SafeTabsList>
      </Tabs>
    );

    render(
      <PaneTabs tabs={tabs}>
        <div data-testid="content">Test Content</div>
      </PaneTabs>
    );

    expect(screen.getByRole('tab', { name: 'Tab 1' })).toBeInTheDocument();
    expect(screen.getByTestId('content')).toBeInTheDocument();
  });

  it('applies sticky styling when sticky prop is true', () => {
    const tabs = (
      <Tabs defaultValue="tab1">
        <SafeTabsList>
          <TabsTrigger value="tab1">Tab 1</TabsTrigger>
        </SafeTabsList>
      </Tabs>
    );

    const { container } = render(
      <PaneTabs tabs={tabs} sticky>
        <div>Content</div>
      </PaneTabs>
    );

    // Check for sticky header structure
    const stickyHeader = container.querySelector('.sticky');
    expect(stickyHeader).toBeInTheDocument();
    expect(stickyHeader).toHaveClass('top-0', 'z-10', 'bg-background');
  });
});

describe('SafeTabsList', () => {
  it('applies safe spacing classes', () => {
    render(
      <Tabs defaultValue="test">
        <SafeTabsList data-testid="tabs-list">
          <TabsTrigger value="test">Test</TabsTrigger>
        </SafeTabsList>
      </Tabs>
    );

    const tabsList = screen.getByTestId('tabs-list');
    expect(tabsList).toHaveClass('mb-3'); // default normal spacing
    expect(tabsList).toHaveClass('h-8', 'gap-1', 'rounded-lg', 'bg-muted', 'p-1');
  });

  it('removes negative margins from className', () => {
    render(
      <Tabs defaultValue="test">
        <SafeTabsList 
          className="-mb-1 -mb-2 mt-[-1px] some-other-class"
          data-testid="tabs-list"
        >
          <TabsTrigger value="test">Test</TabsTrigger>
        </SafeTabsList>
      </Tabs>
    );

    const tabsList = screen.getByTestId('tabs-list');
    expect(tabsList).toHaveClass('some-other-class'); // keeps safe classes
    expect(tabsList).not.toHaveClass('-mb-1', '-mb-2'); // removes negative margins
    expect(tabsList).toHaveClass('mb-3'); // adds safe spacing
  });

  it('applies different spacing variants', () => {
    const { rerender } = render(
      <Tabs defaultValue="test">
        <SafeTabsList spacing="tight" data-testid="tabs-list">
          <TabsTrigger value="test">Test</TabsTrigger>
        </SafeTabsList>
      </Tabs>
    );

    expect(screen.getByTestId('tabs-list')).toHaveClass('mb-2');

    rerender(
      <Tabs defaultValue="test">
        <SafeTabsList spacing="loose" data-testid="tabs-list">
          <TabsTrigger value="test">Test</TabsTrigger>
        </SafeTabsList>
      </Tabs>
    );

    expect(screen.getByTestId('tabs-list')).toHaveClass('mb-4');
  });
});