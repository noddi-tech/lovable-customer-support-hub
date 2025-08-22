import type { Meta, StoryObj } from '@storybook/react';
import { ResponsiveGrid } from '../components/layouts/ResponsiveGrid';

const meta: Meta<typeof ResponsiveGrid> = {
  title: 'Layout/ResponsiveGrid',
  component: ResponsiveGrid,
  parameters: {
    layout: 'fullscreen',
  },
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof meta>;

const GridItem = ({ children }: { children: React.ReactNode }) => (
  <div className="bg-muted p-4 rounded border-2 border-dashed border-border text-center">
    {children}
  </div>
);

export const Default: Story = {
  args: {
    children: Array.from({ length: 6 }, (_, i) => (
      <GridItem key={i}>Item {i + 1}</GridItem>
    )),
  },
};

export const ResponsiveColumns: Story = {
  args: {
    cols: { sm: 1, md: 2, lg: 3, xl: 4 },
    gap: '4',
    children: Array.from({ length: 8 }, (_, i) => (
      <GridItem key={i}>
        <strong>Item {i + 1}</strong>
        <p className="text-sm mt-1">Responsive grid</p>
      </GridItem>
    )),
  },
};

export const AutoFitLayout: Story = {
  args: {
    autoFit: true,
    minColWidth: '200px',
    gap: '4',
    children: Array.from({ length: 12 }, (_, i) => (
      <GridItem key={i}>
        <strong>Auto {i + 1}</strong>
        <p className="text-sm mt-1">Min 200px width</p>
      </GridItem>
    )),
  },
};