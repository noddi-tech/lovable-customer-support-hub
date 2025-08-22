import type { Meta, StoryObj } from '@storybook/react';
import { ResponsiveFlex } from '../components/layouts/ResponsiveFlex';

const meta: Meta<typeof ResponsiveFlex> = {
  title: 'Layout/ResponsiveFlex',
  component: ResponsiveFlex,
  parameters: {
    layout: 'fullscreen',
  },
  tags: ['autodocs'],
  argTypes: {
    direction: {
      control: 'select',
      options: ['row', 'col', 'responsive'],
      description: 'Flex direction',
    },
    breakpoint: {
      control: 'select',
      options: ['sm', 'md', 'lg', 'xl'],
      description: 'Breakpoint for responsive direction',
    },
    gap: {
      control: 'object',
      description: 'Responsive gap values',
    },
    align: {
      control: 'select',
      options: ['start', 'center', 'end', 'stretch', 'baseline'],
      description: 'Align items',
    },
    justify: {
      control: 'select',
      options: ['start', 'center', 'end', 'between', 'around', 'evenly'],
      description: 'Justify content',
    },
    wrap: {
      control: 'boolean',
      description: 'Allow flex wrap',
    },
  },
};

export default meta;
type Story = StoryObj<typeof meta>;

const FlexItem = ({ children, className = "" }: { children: React.ReactNode; className?: string }) => (
  <div className={`bg-muted p-4 rounded border-2 border-dashed border-border text-center ${className}`}>
    {children}
  </div>
);

export const Default: Story = {
  args: {
    children: (
      <>
        <FlexItem>Item 1</FlexItem>
        <FlexItem>Item 2</FlexItem>
        <FlexItem>Item 3</FlexItem>
      </>
    ),
  },
};

export const ResponsiveDirection: Story = {
  args: {
    direction: 'responsive',
    breakpoint: 'md',
    gap: { sm: '2', md: '4' },
    children: (
      <>
        <FlexItem>
          <strong>Item 1</strong>
          <p className="text-sm mt-1">Stacked on mobile</p>
        </FlexItem>
        <FlexItem>
          <strong>Item 2</strong>
          <p className="text-sm mt-1">Row on md+</p>
        </FlexItem>
        <FlexItem>
          <strong>Item 3</strong>
          <p className="text-sm mt-1">Resize to see change</p>
        </FlexItem>
      </>
    ),
  },
  parameters: {
    viewport: {
      viewports: {
        mobile: { name: 'Mobile', styles: { width: '375px', height: '667px' } },
        tablet: { name: 'Tablet', styles: { width: '768px', height: '1024px' } },
        desktop: { name: 'Desktop', styles: { width: '1024px', height: '768px' } },
      },
    },
  },
};

export const ResponsiveGap: Story = {
  args: {
    direction: 'row',
    gap: { sm: '1', md: '3', lg: '6', xl: '8' },
    children: (
      <>
        <FlexItem>Gap 1</FlexItem>
        <FlexItem>Gap 3</FlexItem>
        <FlexItem>Gap 6</FlexItem>
        <FlexItem>Gap 8</FlexItem>
      </>
    ),
  },
};

export const AlignmentOptions: Story = {
  render: () => (
    <div className="space-y-6">
      {(['start', 'center', 'end', 'stretch'] as const).map((align) => (
        <div key={align} className="border border-border p-4 rounded">
          <h3 className="font-semibold mb-2">align="{align}"</h3>
          <ResponsiveFlex direction="row" gap="4" align={align} className="h-24 bg-muted/20 rounded">
            <FlexItem className="h-8">Item 1</FlexItem>
            <FlexItem className="h-12">Item 2</FlexItem>
            <FlexItem className="h-6">Item 3</FlexItem>
          </ResponsiveFlex>
        </div>
      ))}
    </div>
  ),
};

export const JustifyOptions: Story = {
  render: () => (
    <div className="space-y-6">
      {(['start', 'center', 'end', 'between', 'around', 'evenly'] as const).map((justify) => (
        <div key={justify} className="border border-border p-4 rounded">
          <h3 className="font-semibold mb-2">justify="{justify}"</h3>
          <ResponsiveFlex direction="row" gap="2" justify={justify} className="bg-muted/20 rounded p-2">
            <FlexItem className="w-16">A</FlexItem>
            <FlexItem className="w-16">B</FlexItem>
            <FlexItem className="w-16">C</FlexItem>
          </ResponsiveFlex>
        </div>
      ))}
    </div>
  ),
};

export const FlexWrap: Story = {
  args: {
    direction: 'row',
    gap: '4',
    wrap: true,
    children: Array.from({ length: 12 }, (_, i) => (
      <FlexItem key={i} className="min-w-32">
        Item {i + 1}
      </FlexItem>
    )),
  },
};

export const ManyChildren: Story = {
  args: {
    direction: 'responsive',
    breakpoint: 'lg',
    gap: '3',
    wrap: true,
    children: Array.from({ length: 20 }, (_, i) => (
      <FlexItem key={i} className="min-w-24">
        {i + 1}
      </FlexItem>
    )),
  },
};

export const SemanticElements: Story = {
  render: () => (
    <div className="space-y-4">
      <ResponsiveFlex as="nav" direction="row" gap="4" className="border border-border p-4 rounded">
        <FlexItem>&lt;nav&gt; element</FlexItem>
        <FlexItem>Navigation item</FlexItem>
        <FlexItem>Another item</FlexItem>
      </ResponsiveFlex>
      <ResponsiveFlex as="section" direction="col" gap="2" className="border border-border p-4 rounded">
        <FlexItem>&lt;section&gt; element</FlexItem>
        <FlexItem>Section content</FlexItem>
      </ResponsiveFlex>
    </div>
  ),
};

export const ComplexLayout: Story = {
  args: {
    direction: 'col',
    gap: '6',
    children: (
      <>
        <div className="bg-primary text-primary-foreground p-4 rounded">
          <h2 className="text-xl font-bold">Header</h2>
        </div>
        <ResponsiveFlex direction="responsive" breakpoint="md" gap="4">
          <div className="bg-muted p-4 rounded flex-1">
            <h3 className="font-semibold mb-2">Main Content</h3>
            <p>This content takes up more space on larger screens.</p>
          </div>
          <div className="bg-accent p-4 rounded md:w-64">
            <h3 className="font-semibold mb-2">Sidebar</h3>
            <p>Fixed width sidebar on md+.</p>
          </div>
        </ResponsiveFlex>
        <div className="bg-card border p-4 rounded">
          <h2 className="text-lg font-semibold">Footer</h2>
        </div>
      </>
    ),
  },
};