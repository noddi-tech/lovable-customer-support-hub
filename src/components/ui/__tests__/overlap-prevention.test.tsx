import { render, screen } from '@testing-library/react';
import AdminDesignComponents from '@/pages/AdminDesignComponents';
import { CampaignBuilderShell } from '@/components/dashboard/newsletter/CampaignBuilderShell';
import { ResponsiveTabs, ResponsiveTabsList, ResponsiveTabsTrigger } from '@/components/admin/design/components/layouts/ResponsiveTabs';

describe('Overlap Prevention', () => {
  describe('AdminDesignComponents', () => {
    it('should not use whitespace-nowrap on tabs', () => {
      const { container } = render(<AdminDesignComponents />);
      
      const tabs = container.querySelectorAll('[role="tab"]');
      tabs.forEach(tab => {
        const styles = window.getComputedStyle(tab);
        expect(styles.whiteSpace).not.toBe('nowrap');
        expect(tab.className).toMatch(/truncate|min-w-0/);
      });
    });

    it('should have flex-wrap on tabs container', () => {
      const { container } = render(<AdminDesignComponents />);
      
      const tabsList = container.querySelector('[role="tablist"]');
      expect(tabsList?.className).toMatch(/flex-wrap/);
    });
  });

  describe('CampaignBuilderShell', () => {
    const mockProps = {
      left: <div>Left Panel</div>,
      center: <div>Center Panel</div>,
      right: <div>Right Panel</div>,
      toolbar: <div>Toolbar</div>
    };

    it('should use minmax grid columns for flexible layouts', () => {
      const { container } = render(<CampaignBuilderShell {...mockProps} />);
      
      const gridContainer = container.querySelector('[data-testid="campaigns-grid"]');
      expect(gridContainer?.className).toMatch(/minmax/);
    });

    it('should have flex-wrap on mobile toolbars', () => {
      // Mock mobile viewport
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 400,
      });

      const { container } = render(<CampaignBuilderShell {...mockProps} />);
      
      const toolbar = container.querySelector('.flex.flex-wrap');
      expect(toolbar).toBeInTheDocument();
    });

    it('should prevent button overflow with flex-shrink-0', () => {
      const { container } = render(<CampaignBuilderShell {...mockProps} />);
      
      const buttons = container.querySelectorAll('button');
      buttons.forEach(button => {
        if (button.textContent?.includes('Blocks') || button.textContent?.includes('Inspector')) {
          expect(button.className).toMatch(/flex-shrink-0/);
        }
      });
    });
  });

  describe('ResponsiveTabs', () => {
    it('should handle long tab names without overflow', () => {
      render(
        <ResponsiveTabs defaultValue="tab1">
          <ResponsiveTabsList>
            <ResponsiveTabsTrigger value="tab1">Very Long Tab Name That Should Not Overflow</ResponsiveTabsTrigger>
            <ResponsiveTabsTrigger value="tab2">Another Long Tab Name</ResponsiveTabsTrigger>
          </ResponsiveTabsList>
        </ResponsiveTabs>
      );

      const tabs = screen.getAllByRole('tab');
      tabs.forEach(tab => {
        expect(tab.className).toMatch(/truncate/);
        expect(tab.className).toMatch(/min-w-0/);
      });
    });

    it('should support wrapping when needed', () => {
      const { container } = render(
        <ResponsiveTabs defaultValue="tab1">
          <ResponsiveTabsList className="flex-wrap">
            <ResponsiveTabsTrigger value="tab1">Tab 1</ResponsiveTabsTrigger>
            <ResponsiveTabsTrigger value="tab2">Tab 2</ResponsiveTabsTrigger>
            <ResponsiveTabsTrigger value="tab3">Tab 3</ResponsiveTabsTrigger>
            <ResponsiveTabsTrigger value="tab4">Tab 4</ResponsiveTabsTrigger>
          </ResponsiveTabsList>
        </ResponsiveTabs>
      );

      const tabsList = container.querySelector('[role="tablist"]');
      expect(tabsList?.className).toMatch(/flex-wrap/);
    });
  });

  describe('Lint Pattern Validation', () => {
    it('should not contain risky CSS patterns', () => {
      const riskyPatterns = [
        /-mb-1\b/,
        /-mb-2\b/,
        /-mb-px\b/,
        /mt-\[-1px\]/,
        /whitespace-nowrap.*TabsList/,
        /TabsList.*whitespace-nowrap/
      ];

      // Mock component code that should pass lint
      const safeCode = `
        <TabsList className="flex-wrap gap-1 mb-3">
          <TabsTrigger className="truncate min-w-0">Tab</TabsTrigger>
        </TabsList>
      `;

      riskyPatterns.forEach(pattern => {
        expect(pattern.test(safeCode)).toBe(false);
      });
    });

    it('should detect risky patterns correctly', () => {
      const riskyCode = `
        <TabsList className="whitespace-nowrap -mb-1">
          <TabsTrigger>Tab</TabsTrigger>
        </TabsList>
      `;

      expect(/-mb-1\b/.test(riskyCode)).toBe(true);
      expect(/whitespace-nowrap.*TabsList/.test(riskyCode)).toBe(true);
    });
  });
});