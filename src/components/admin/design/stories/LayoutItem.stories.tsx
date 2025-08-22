import type { Meta, StoryObj } from '@storybook/react';
import { LayoutItem } from '../components/layouts/LayoutItem';
import { ResponsiveFlex } from '../components/layouts/ResponsiveFlex';

const meta: Meta<typeof LayoutItem> = {
  title: 'Layout/LayoutItem',
  component: LayoutItem,
  parameters: {
    layout: 'fullscreen',
  },
  tags: ['autodocs'],
  argTypes: {
    flex: {
      control: 'text',
      description: 'Flex shorthand property',
    },
    grow: {
      control: 'boolean',
      description: 'Allow item to grow',
    },
    shrink: {
      control: 'boolean',
      description: 'Allow item to shrink',
    },
    basis: {
      control: 'text',
      description: 'Flex basis value',
    },
    minWidth: {
      control: 'object',
      description: 'Responsive minimum width',
    },
    maxWidth: {
      control: 'object',
      description: 'Responsive maximum width',
    },
    order: {
      control: 'object',
      description: 'Responsive flex order',
    },
    as: {
      control: 'select',
      options: ['div', 'section', 'article', 'main', 'aside'],
      description: 'HTML element to render',
    },
  },
  decorators: [
    (Story) => (
      <ResponsiveFlex direction="row" gap="4" className="border border-border p-4 rounded">
        <Story />
      </ResponsiveFlex>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof meta>;

const ItemContent = ({ children, className = "" }: { children: React.ReactNode; className?: string }) => (
  <div className={`bg-muted p-4 rounded border-2 border-dashed border-border text-center ${className}`}>
    {children}
  </div>
);

export const Default: Story = {
  args: {
    children: <ItemContent>Default Item</ItemContent>,
  },
  decorators: [
    (Story) => (
      <ResponsiveFlex direction="row" gap="4" className="border border-border p-4 rounded">
        <LayoutItem>
          <ItemContent>Item 1</ItemContent>
        </LayoutItem>
        <Story />
        <LayoutItem>
          <ItemContent>Item 3</ItemContent>
        </LayoutItem>
      </ResponsiveFlex>
    ),
  ],
};

export const FlexGrow: Story = {
  args: {
    grow: true,
    children: <ItemContent><strong>Grows to fill space</strong></ItemContent>,
  },
  decorators: [
    (Story) => (
      <ResponsiveFlex direction="row" gap="4" className="border border-border p-4 rounded">
        <LayoutItem>
          <ItemContent>Fixed</ItemContent>
        </LayoutItem>
        <Story />
        <LayoutItem>
          <ItemContent>Fixed</ItemContent>
        </LayoutItem>
      </ResponsiveFlex>
    ),
  ],
};

export const FlexShrink: Story = {
  args: {
    shrink: false,
    children: <ItemContent><strong>Won't shrink below content size</strong></ItemContent>,
  },
  decorators: [
    (Story) => (
      <ResponsiveFlex direction="row" gap="2" className="border border-border p-4 rounded w-80">
        <LayoutItem>
          <ItemContent>Long content that would normally wrap or shrink</ItemContent>
        </LayoutItem>
        <Story />
        <LayoutItem>
          <ItemContent>Another item</ItemContent>
        </LayoutItem>
      </ResponsiveFlex>
    ),
  ],
};

export const FlexBasis: Story = {
  render: () => (
    <div className="space-y-4">
      {['auto', '200px', '50%', '1/3'].map((basis) => (
        <div key={basis} className="border border-border p-4 rounded">
          <h3 className="font-semibold mb-2">basis="{basis}"</h3>
          <ResponsiveFlex direction="row" gap="4">
            <LayoutItem>
              <ItemContent>Item 1</ItemContent>
            </LayoutItem>
            <LayoutItem basis={basis}>
              <ItemContent><strong>basis: {basis}</strong></ItemContent>
            </LayoutItem>
            <LayoutItem>
              <ItemContent>Item 3</ItemContent>
            </LayoutItem>
          </ResponsiveFlex>
        </div>
      ))}
    </div>
  ),
};

export const ResponsiveWidths: Story = {
  args: {
    minWidth: { sm: '100px', md: '150px', lg: '200px' },
    maxWidth: { sm: '200px', md: '300px', lg: '400px' },
    children: (
      <ItemContent>
        <strong>Responsive Widths</strong>
        <p className="text-sm mt-1">Min/max changes with viewport</p>
      </ItemContent>
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

export const ResponsiveOrder: Story = {
  render: () => (
    <div className="space-y-6">
      <div className="border border-border p-4 rounded">
        <h3 className="font-semibold mb-4">Mobile: 3-1-2 order, Desktop: 1-2-3 order</h3>
        <ResponsiveFlex direction="row" gap="4">
          <LayoutItem order={{ sm: 2, lg: 1 }}>
            <ItemContent className="bg-red-100">
              <strong>Item 1</strong>
              <p className="text-xs">order: sm:2, lg:1</p>
            </ItemContent>
          </LayoutItem>
          <LayoutItem order={{ sm: 3, lg: 2 }}>
            <ItemContent className="bg-green-100">
              <strong>Item 2</strong>
              <p className="text-xs">order: sm:3, lg:2</p>
            </ItemContent>
          </LayoutItem>
          <LayoutItem order={{ sm: 1, lg: 3 }}>
            <ItemContent className="bg-blue-100">
              <strong>Item 3</strong>
              <p className="text-xs">order: sm:1, lg:3</p>
            </ItemContent>
          </LayoutItem>
        </ResponsiveFlex>
      </div>
    </div>
  ),
  parameters: {
    viewport: {
      viewports: {
        mobile: { name: 'Mobile', styles: { width: '375px', height: '667px' } },
        desktop: { name: 'Desktop', styles: { width: '1024px', height: '768px' } },
      },
    },
  },
};

export const FlexShorthand: Story = {
  render: () => (
    <div className="space-y-4">
      {[
        { flex: '1', label: 'flex="1"' },
        { flex: '0 0 200px', label: 'flex="0 0 200px"' },
        { flex: 'none', label: 'flex="none"' },
        { flex: 'auto', label: 'flex="auto"' },
      ].map(({ flex, label }) => (
        <div key={flex} className="border border-border p-4 rounded">
          <h3 className="font-semibold mb-2">{label}</h3>
          <ResponsiveFlex direction="row" gap="4">
            <LayoutItem>
              <ItemContent>Regular</ItemContent>
            </LayoutItem>
            <LayoutItem flex={flex}>
              <ItemContent><strong>{label}</strong></ItemContent>
            </LayoutItem>
            <LayoutItem>
              <ItemContent>Regular</ItemContent>
            </LayoutItem>
          </ResponsiveFlex>
        </div>
      ))}
    </div>
  ),
};

export const SemanticElements: Story = {
  render: () => (
    <ResponsiveFlex direction="row" gap="4" className="border border-border p-4 rounded">
      <LayoutItem as="article">
        <ItemContent>&lt;article&gt; element</ItemContent>
      </LayoutItem>
      <LayoutItem as="section">
        <ItemContent>&lt;section&gt; element</ItemContent>
      </LayoutItem>
      <LayoutItem as="aside">
        <ItemContent>&lt;aside&gt; element</ItemContent>
      </LayoutItem>
    </ResponsiveFlex>
  ),
};

export const ComplexLayout: Story = {
  render: () => (
    <div className="space-y-6">
      <div className="border border-border p-4 rounded">
        <h3 className="font-semibold mb-4">Sidebar Layout</h3>
        <ResponsiveFlex direction="responsive" breakpoint="md" gap="6">
          <LayoutItem grow minWidth={{ md: '200px' }} maxWidth={{ md: '300px' }}>
            <div className="bg-muted p-4 rounded h-48">
              <h4 className="font-semibold">Sidebar</h4>
              <p className="text-sm mt-2">Fixed width on desktop</p>
            </div>
          </LayoutItem>
          <LayoutItem grow>
            <div className="bg-card border p-4 rounded h-48">
              <h4 className="font-semibold">Main Content</h4>
              <p className="text-sm mt-2">Grows to fill remaining space</p>
            </div>
          </LayoutItem>
        </ResponsiveFlex>
      </div>

      <div className="border border-border p-4 rounded">
        <h3 className="font-semibold mb-4">Dashboard Layout</h3>
        <ResponsiveFlex direction="col" gap="4">
          <LayoutItem>
            <div className="bg-primary text-primary-foreground p-4 rounded">
              <h4 className="font-bold">Header</h4>
            </div>
          </LayoutItem>
          <ResponsiveFlex direction="row" gap="4">
            <LayoutItem basis="200px" shrink={false}>
              <div className="bg-muted p-4 rounded h-32">
                <h5 className="font-semibold">Nav</h5>
              </div>
            </LayoutItem>
            <LayoutItem grow>
              <div className="bg-card border p-4 rounded h-32">
                <h5 className="font-semibold">Content</h5>
              </div>
            </LayoutItem>
            <LayoutItem basis="150px" shrink={false}>
              <div className="bg-accent p-4 rounded h-32">
                <h5 className="font-semibold">Aside</h5>
              </div>
            </LayoutItem>
          </ResponsiveFlex>
        </ResponsiveFlex>
      </div>
    </div>
  ),
};