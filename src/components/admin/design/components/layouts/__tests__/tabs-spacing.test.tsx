import { render, screen } from '@testing-library/react';
import NewsletterBuilder from '@/components/dashboard/NewsletterBuilder';

describe('Tabs Spacing', () => {
  it('ensures campaigns grid renders without overlap violations', () => {
    render(<NewsletterBuilder />);
    
    const grid = screen.getByTestId('campaigns-grid');
    expect(grid).toBeInTheDocument();
    
    // Ensure no shell-level container classes that could cause overlap
    const content = grid.closest('[class*="max-w"]') || 
                   grid.closest('[class*="mx-auto"]') || 
                   grid.closest('[class*="container"]');
    expect(content).toBeNull();
  });

  it('ensures TabsList never has negative margins', () => {
    const { container } = render(<NewsletterBuilder />);
    
    // Find all TabsList elements
    const tabsLists = container.querySelectorAll('[role="tablist"]');
    
    tabsLists.forEach(tabsList => {
      const classes = tabsList.className;
      
      // Check for risky patterns
      expect(classes).not.toMatch(/-mb-1\b/);
      expect(classes).not.toMatch(/-mb-2\b/);
      expect(classes).not.toMatch(/-mb-px\b/);
      expect(classes).not.toMatch(/mt-\[-1px\]/);
      
      // Should have safe spacing
      expect(classes).toMatch(/mb-\d/);
    });
  });
});