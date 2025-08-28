import { render } from '@testing-library/react';
import { TabsTrigger, Tabs, TabsList } from '../tabs';
import { ResponsiveTabsTrigger, ResponsiveTabs, ResponsiveTabsList } from '@/components/admin/design/components/layouts';

describe('Tabs Layout Enforcement', () => {
  describe('Base TabsTrigger', () => {
    it('should enforce horizontal layout and strip vertical classes', () => {
      const { container } = render(
        <Tabs defaultValue="test">
          <TabsList>
            <TabsTrigger value="test" className="flex-col items-start w-10">
              Test Tab
            </TabsTrigger>
          </TabsList>
        </Tabs>
      );

      const trigger = container.querySelector('[role="tab"]');
      expect(trigger).toBeTruthy();
      
      const classList = trigger?.classList.value || '';
      
      // Should have horizontal layout enforced
      expect(classList).toContain('flex-row');
      expect(classList).toContain('whitespace-nowrap');
      expect(classList).toContain('items-center');
      expect(classList).toContain('shrink-0');
      expect(classList).toContain('min-w-fit');
      
      // Should not have vertical layout
      expect(classList).not.toContain('flex-col');
    });

    it('should sanitize grid classes to inline-flex', () => {
      const { container } = render(
        <Tabs defaultValue="test">
          <TabsList>
            <TabsTrigger value="test" className="grid place-items-center">
              Grid Tab
            </TabsTrigger>
          </TabsList>
        </Tabs>
      );

      const trigger = container.querySelector('[role="tab"]');
      const classList = trigger?.classList.value || '';
      
      // Should convert grid to inline-flex and remove grid
      expect(classList).toContain('inline-flex');
      expect(classList).not.toContain('grid');
    });
  });

  describe('ResponsiveTabsTrigger', () => {
    it('should enforce horizontal layout and sanitize vertical overrides', () => {
      const { container } = render(
        <ResponsiveTabs defaultValue="test">
          <ResponsiveTabsList>
            <ResponsiveTabsTrigger value="test" className="flex-col grid items-start">
              <span>Icon</span>
              <span>Label</span>
            </ResponsiveTabsTrigger>
          </ResponsiveTabsList>
        </ResponsiveTabs>
      );

      const trigger = container.querySelector('[role="tab"]');
      expect(trigger).toBeTruthy();
      
      const classList = trigger?.classList.value || '';
      
      // Should have horizontal layout enforced
      expect(classList).toContain('inline-flex');
      expect(classList).toContain('flex-row');
      expect(classList).toContain('items-center');
      expect(classList).toContain('whitespace-nowrap');
      expect(classList).toContain('shrink-0');
      expect(classList).toContain('min-w-fit');
      expect(classList).toContain('leading-none');
      
      // Should not have vertical layout
      expect(classList).not.toContain('flex-col');
      expect(classList).not.toContain('grid');
      expect(classList).not.toContain('items-start');
    });
  });
});