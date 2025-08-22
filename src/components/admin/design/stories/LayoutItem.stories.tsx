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
};

export default meta;
type Story = StoryObj<typeof meta>;

const ItemContent = ({ children }: { children: React.ReactNode }) => (
  <div className="bg-muted p-4 rounded border-2 border-dashed border-border text-center">
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
        <LayoutItem flex="none">
          <ItemContent>Fixed</ItemContent>
        </LayoutItem>
        <Story />
        <LayoutItem flex="none">
          <ItemContent>Fixed</ItemContent>
        </LayoutItem>
      </ResponsiveFlex>
    ),
  ],
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
};

export const ResponsiveOrder: Story = {
  render: () => (
    <div className="border border-border p-4 rounded">
      <h3 className="font-semibold mb-4">Order changes: Mobile vs Desktop</h3>
      <ResponsiveFlex direction="row" gap="4">
        <LayoutItem order={{ sm: '2', lg: '1' }}>
          <ItemContent>
            <strong>Item 1</strong>
            <p className="text-xs">order: sm:2, lg:1</p>
          </ItemContent>
        </LayoutItem>
        <LayoutItem order={{ sm: '3', lg: '2' }}>
          <ItemContent>
            <strong>Item 2</strong>
            <p className="text-xs">order: sm:3, lg:2</p>
          </ItemContent>
        </LayoutItem>
        <LayoutItem order={{ sm: '1', lg: '3' }}>
          <ItemContent>
            <strong>Item 3</strong>
            <p className="text-xs">order: sm:1, lg:3</p>
          </ItemContent>
        </LayoutItem>
      </ResponsiveFlex>
    </div>
  ),
};

export const FlexBasis: Story = {
  render: () => (
    <div className="space-y-4">
      {['auto', '200px', '50%'].map((basis) => (
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