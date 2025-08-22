import type { Meta, StoryObj } from '@storybook/react';
import { ResponsiveContainer } from '../components/layouts/ResponsiveContainer';

const meta: Meta<typeof ResponsiveContainer> = {
  title: 'Layout/ResponsiveContainer',
  component: ResponsiveContainer,
  parameters: {
    layout: 'fullscreen',
  },
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    children: (
      <div className="bg-muted p-4 rounded border-2 border-dashed border-border">
        <h3 className="text-lg font-semibold mb-2">Default Container</h3>
        <p>This container uses default padding and maxWidth settings.</p>
      </div>
    ),
  },
};

export const ResponsivePadding: Story = {
  args: {
    padding: { sm: '2', md: '4', lg: '6', xl: '8' },
    children: (
      <div className="bg-muted p-4 rounded border-2 border-dashed border-border">
        <h3 className="text-lg font-semibold mb-2">Responsive Padding</h3>
        <p>Padding changes: sm:p-2 → md:p-4 → lg:p-6 → xl:p-8</p>
        <p className="text-sm text-muted-foreground mt-2">Resize viewport to see changes.</p>
      </div>
    ),
  },
};

export const CenteredContainer: Story = {
  args: {
    center: true,
    maxWidth: 'md',
    children: (
      <div className="bg-primary text-primary-foreground p-6 rounded text-center">
        <h3 className="text-xl font-bold mb-2">Centered Container</h3>
        <p>This container is horizontally centered with max-width constraint.</p>
      </div>
    ),
  },
};