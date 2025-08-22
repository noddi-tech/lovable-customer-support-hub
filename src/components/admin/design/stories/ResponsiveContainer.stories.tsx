import type { Meta, StoryObj } from '@storybook/react';
import { ResponsiveContainer } from '../components/layouts/ResponsiveContainer';

const meta: Meta<typeof ResponsiveContainer> = {
  title: 'Layout/ResponsiveContainer',
  component: ResponsiveContainer,
  parameters: {
    layout: 'fullscreen',
  },
  tags: ['autodocs'],
  argTypes: {
    padding: {
      control: 'object',
      description: 'Responsive padding values',
    },
    maxWidth: {
      control: 'select',
      options: ['sm', 'md', 'lg', 'xl', '2xl', '3xl', '4xl', '5xl', '6xl', '7xl', 'full', 'screen-sm', 'screen-md', 'screen-lg', 'screen-xl', 'screen-2xl'],
      description: 'Maximum width constraint',
    },
    center: {
      control: 'boolean',
      description: 'Center the container horizontally',
    },
    as: {
      control: 'select',
      options: ['div', 'section', 'article', 'main', 'aside'],
      description: 'HTML element to render',
    },
  },
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    children: (
      <div className="bg-muted p-4 rounded border-2 border-dashed border-border">
        <h3 className="text-lg font-semibold mb-2">Default Container</h3>
        <p>This container uses default padding (4) and maxWidth (7xl).</p>
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
        <p className="text-sm text-muted-foreground mt-2">Resize the viewport to see padding changes.</p>
      </div>
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

export const MaxWidthVariants: Story = {
  render: () => (
    <div className="space-y-4">
      {(['sm', 'md', 'lg', 'xl', '2xl'] as const).map((width) => (
        <ResponsiveContainer key={width} maxWidth={width} className="border border-border">
          <div className="bg-muted p-4 rounded text-center">
            <strong>maxWidth="{width}"</strong>
          </div>
        </ResponsiveContainer>
      ))}
    </div>
  ),
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

export const MultipleChildren: Story = {
  args: {
    padding: '6',
    children: (
      <>
        <div className="bg-muted p-4 rounded mb-4">
          <h3 className="font-semibold">First Child</h3>
          <p>Multiple children are supported naturally.</p>
        </div>
        <div className="bg-accent p-4 rounded mb-4">
          <h3 className="font-semibold">Second Child</h3>
          <p>Each child maintains its own styling.</p>
        </div>
        <div className="bg-card border p-4 rounded">
          <h3 className="font-semibold">Third Child</h3>
          <p>Container provides consistent spacing and constraints.</p>
        </div>
      </>
    ),
  },
};

export const SemanticElements: Story = {
  render: () => (
    <div className="space-y-4">
      <ResponsiveContainer as="main" className="border border-border">
        <div className="bg-muted p-4 rounded">
          <strong>&lt;main&gt;</strong> element
        </div>
      </ResponsiveContainer>
      <ResponsiveContainer as="section" className="border border-border">
        <div className="bg-muted p-4 rounded">
          <strong>&lt;section&gt;</strong> element
        </div>
      </ResponsiveContainer>
      <ResponsiveContainer as="article" className="border border-border">
        <div className="bg-muted p-4 rounded">
          <strong>&lt;article&gt;</strong> element
        </div>
      </ResponsiveContainer>
    </div>
  ),
};

export const NestedContainers: Story = {
  args: {
    padding: '8',
    maxWidth: 'xl',
    children: (
      <div className="bg-muted p-4 rounded">
        <h3 className="text-lg font-semibold mb-4">Outer Container</h3>
        <ResponsiveContainer padding="4" maxWidth="md" className="bg-background border rounded">
          <div className="bg-accent p-4 rounded">
            <h4 className="font-semibold">Nested Container</h4>
            <p>Containers can be nested for complex layouts.</p>
          </div>
        </ResponsiveContainer>
      </div>
    ),
  },
};