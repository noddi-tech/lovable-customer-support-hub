import type { Meta, StoryObj } from '@storybook/react';
import { ResponsiveFlex } from '../components/layouts/ResponsiveFlex';

const meta: Meta<typeof ResponsiveFlex> = {
  title: 'Layout/ResponsiveFlex',
  component: ResponsiveFlex,
  parameters: {
    layout: 'fullscreen',
  },
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof meta>;

const FlexItem = ({ children }: { children: React.ReactNode }) => (
  <div className="bg-muted p-4 rounded border-2 border-dashed border-border text-center">
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
};

export const FlexWrap: Story = {
  args: {
    direction: 'row',
    gap: '4',
    wrap: true,
    children: Array.from({ length: 12 }, (_, i) => (
      <FlexItem key={i}>
        Item {i + 1}
      </FlexItem>
    )),
  },
};