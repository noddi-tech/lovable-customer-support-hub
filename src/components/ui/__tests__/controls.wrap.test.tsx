import { render, screen } from '@testing-library/react';
import { TabsBar, Toolbar } from '../controls';
import { Button } from '../button';

describe('Controls Wrap Components', () => {
  it('renders TabsBar with proper classes for wrapping', () => {
    const tabs = [
      { value: 'tab1', label: 'Tab 1' },
      { value: 'tab2', label: 'Tab 2' },
      { value: 'tab3', label: 'Tab 3' },
      { value: 'tab4', label: 'Tab 4' },
      { value: 'tab5', label: 'Tab 5' },
      { value: 'tab6', label: 'Tab 6' }
    ];

    render(
      <div className="w-64"> {/* Narrow container to force wrap */}
        <TabsBar tabs={tabs} value="tab1" />
      </div>
    );

    // Assert TabsList has control classes for flex-wrap behavior
    const tabsList = document.querySelector('[role="tablist"]');
    expect(tabsList).toHaveClass('control-tabslist');
    expect(tabsList).toHaveClass('control-safe-spacing');

    // Assert TabsTriggers have control-tab class
    const tabTriggers = document.querySelectorAll('[role="tab"]');
    tabTriggers.forEach(trigger => {
      expect(trigger).toHaveClass('control-tab');
    });
  });

  it('renders Toolbar with proper classes for wrapping', () => {
    render(
      <div className="w-64"> {/* Narrow container to force wrap */}
        <Toolbar>
          <Button>Button 1</Button>
          <Button>Button 2</Button>
          <Button>Button 3</Button>
          <Button>Button 4</Button>
          <Button>Button 5</Button>
          <Button>Button 6</Button>
          <Button>Button 7</Button>
          <Button>Button 8</Button>
        </Toolbar>
      </div>
    );

    // Assert toolbar has control-toolbar class for flex-wrap behavior
    const toolbar = screen.getByRole('toolbar');
    expect(toolbar).toHaveClass('control-toolbar');
    expect(toolbar).toHaveClass('flex-wrap');
  });

  it('applies spacing variants correctly', () => {
    render(
      <>
        <Toolbar spacing="tight" data-testid="tight">
          <Button>Button</Button>
        </Toolbar>
        <Toolbar spacing="normal" data-testid="normal">
          <Button>Button</Button>
        </Toolbar>
        <Toolbar spacing="loose" data-testid="loose">
          <Button>Button</Button>
        </Toolbar>
      </>
    );

    expect(screen.getByTestId('tight')).toHaveClass('gap-1');
    expect(screen.getByTestId('normal')).toHaveClass('gap-2');
    expect(screen.getByTestId('loose')).toHaveClass('gap-4');
  });

  it('handles equalWidth prop for TabsBar', () => {
    const tabs = [
      { value: 'tab1', label: 'Tab 1' },
      { value: 'tab2', label: 'Tab 2' },
      { value: 'tab3', label: 'Tab 3' }
    ];

    render(
      <TabsBar tabs={tabs} value="tab1" equalWidth />
    );

    const tabsList = document.querySelector('[role="tablist"]');
    expect(tabsList).toHaveClass('grid');
    expect(tabsList).toHaveClass('grid-cols-3');
  });

  it('prevents wrapping when wrap=false on Toolbar', () => {
    render(
      <Toolbar wrap={false} data-testid="no-wrap">
        <Button>Button</Button>
      </Toolbar>
    );

    const toolbar = screen.getByTestId('no-wrap');
    expect(toolbar).toHaveClass('control-toolbar');
    expect(toolbar).not.toHaveClass('flex-wrap');
  });
});