import { render } from '@testing-library/react';
import { TabsTrigger, Tabs, TabsList } from '../tabs';

describe('TabsTrigger Layout', () => {
  it('should enforce horizontal layout and override vertical classes', () => {
    const { container } = render(
      <Tabs defaultValue="test">
        <TabsList>
          <TabsTrigger value="test" className="flex-col w-10">
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
    
    // Should convert grid to inline-flex
    expect(classList).toContain('inline-flex');
    expect(classList).not.toContain('grid');
  });
});