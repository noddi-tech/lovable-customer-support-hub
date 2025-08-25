import React from 'react';
import { render, screen } from '@testing-library/react';
import { ResponsiveTabs, ResponsiveTabsList, ResponsiveTabsTrigger, ResponsiveTabsContent } from '../ResponsiveTabs';

describe('ResponsiveTabs', () => {
  it('renders correctly with equal width', () => {
    render(
      <ResponsiveTabs equalWidth={true}>
        <ResponsiveTabsList>
          <ResponsiveTabsTrigger value="tab1">Tab 1</ResponsiveTabsTrigger>
          <ResponsiveTabsTrigger value="tab2">Long Tab Name</ResponsiveTabsTrigger>
        </ResponsiveTabsList>
        <ResponsiveTabsContent value="tab1">Content 1</ResponsiveTabsContent>
      </ResponsiveTabs>
    );

    expect(screen.getByText('Tab 1')).toBeInTheDocument();
    expect(screen.getByText('Long Tab Name')).toBeInTheDocument();
  });

  it('applies scrollable styles', () => {
    const { container } = render(
      <ResponsiveTabs scrollable={true}>
        <ResponsiveTabsList>
          <ResponsiveTabsTrigger value="tab1">Tab 1</ResponsiveTabsTrigger>
        </ResponsiveTabsList>
      </ResponsiveTabs>
    );

    const tabsList = container.querySelector('[role="tablist"]');
    expect(tabsList).toHaveClass('overflow-x-auto');
  });
});