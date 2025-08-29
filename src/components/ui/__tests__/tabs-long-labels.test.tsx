import { render, screen } from '@testing-library/react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../tabs';

describe('Tabs with Long Labels', () => {
  it('renders long tab labels without overflow or whitespace-nowrap', () => {
    render(
      <Tabs defaultValue="a">
        <TabsList data-testid="tabs-list" className="flex flex-wrap min-w-0">
          <TabsTrigger value="a" data-testid="t-a">📧 Email Integrations</TabsTrigger>
          <TabsTrigger value="b" data-testid="t-b">📱 SMS & Personalization</TabsTrigger>
          <TabsTrigger value="c" data-testid="t-c">📞 Voice & Telephony Settings</TabsTrigger>
        </TabsList>
      </Tabs>
    );

    const list = screen.getByTestId('tabs-list');
    expect(list.className).toMatch(/flex/);
    expect(list.className).toMatch(/flex-wrap/);
    expect(list.className).toMatch(/min-w-0/);

    for (const id of ['t-a', 't-b', 't-c']) {
      const trigger = screen.getByTestId(id);
      expect(trigger.className).toMatch(/items-center/);
      expect(trigger.className).toMatch(/gap-2/);
      expect(trigger.className).toMatch(/leading-none/);
      expect(trigger.className).not.toMatch(/whitespace-nowrap/);
    }
  });

  it('handles narrow container without horizontal scrollbars', () => {
    render(
      <div className="w-[360px]">
        <Tabs defaultValue="settings">
          <TabsList data-testid="narrow-tabs" className="flex flex-wrap min-w-0">
            <TabsTrigger value="settings" data-testid="t-settings">⚙️ Settings</TabsTrigger>
            <TabsTrigger value="integrations" data-testid="t-integrations">🔗 Integrations</TabsTrigger>
            <TabsTrigger value="notifications" data-testid="t-notifications">🔔 Notifications</TabsTrigger>
          </TabsList>
          <TabsContent value="settings">Settings content</TabsContent>
        </Tabs>
      </div>
    );

    const list = screen.getByTestId('narrow-tabs');
    expect(list.className).toMatch(/flex-wrap/);
    expect(list.className).toMatch(/min-w-0/);
    
    // Should not have overflow-x-auto that would create scrollbars
    expect(list.className).not.toMatch(/overflow-x-auto/);
    
    // Triggers should maintain proper layout
    for (const id of ['t-settings', 't-integrations', 't-notifications']) {
      const trigger = screen.getByTestId(id);
      expect(trigger.className).toMatch(/shrink-0/);
      expect(trigger.className).toMatch(/min-w-fit/);
    }
  });

  it('enforces horizontal layout and prevents vertical classes', () => {
    render(
      <Tabs defaultValue="test">
        <TabsList>
          <TabsTrigger value="test" className="flex-col w-10" data-testid="sanitized-trigger">
            Test Tab
          </TabsTrigger>
        </TabsList>
      </Tabs>
    );

    const trigger = screen.getByTestId('sanitized-trigger');
    const classList = trigger.className;
    
    // Should have horizontal layout enforced
    expect(classList).toContain('flex-row');
    expect(classList).toContain('items-center');
    
    // Should not have vertical layout (stripVertical should remove flex-col)
    expect(classList).not.toContain('flex-col');
  });
});