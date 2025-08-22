import type { Meta, StoryObj } from '@storybook/react';
import { ResponsiveGrid } from '../components/layouts/ResponsiveGrid';

const meta: Meta<typeof ResponsiveGrid> = {
  title: 'Layout/ResponsiveGrid',
  component: ResponsiveGrid,
  parameters: {
    layout: 'fullscreen',
  },
  tags: ['autodocs'],
  argTypes: {
    cols: {
      control: 'object',
      description: 'Responsive column counts',
    },
    gap: {
      control: 'object',
      description: 'Responsive gap values',
    },
    autoFit: {
      control: 'boolean',
      description: 'Enable auto-fit layout',
    },
    minColWidth: {
      control: 'text',
      description: 'Minimum column width for auto-fit',
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

const GridItem = ({ children, className = "" }: { children: React.ReactNode; className?: string }) => (
  <div className={`bg-muted p-4 rounded border-2 border-dashed border-border text-center ${className}`}>
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
    cols: 3,
    gap: { sm: '2', md: '4', lg: '6', xl: '8' },
    children: Array.from({ length: 9 }, (_, i) => (
      <GridItem key={i}>Gap {i + 1}</GridItem>
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

export const AutoFitVariants: Story = {
  render: () => (
    <div className="space-y-8">
      {[
        { minWidth: '150px', label: '150px' },
        { minWidth: '200px', label: '200px' },
        { minWidth: '250px', label: '250px' },
      ].map(({ minWidth, label }) => (
        <div key={minWidth} className="border border-border p-4 rounded">
          <h3 className="font-semibold mb-4">minColWidth="{label}"</h3>
          <ResponsiveGrid autoFit minColWidth={minWidth} gap="3">
            {Array.from({ length: 8 }, (_, i) => (
              <GridItem key={i}>Item {i + 1}</GridItem>
            ))}
          </ResponsiveGrid>
        </div>
      ))}
    </div>
  ),
};

export const DifferentChildCounts: Story = {
  render: () => (
    <div className="space-y-8">
      {[1, 3, 5, 7, 12].map((count) => (
        <div key={count} className="border border-border p-4 rounded">
          <h3 className="font-semibold mb-4">{count} {count === 1 ? 'child' : 'children'}</h3>
          <ResponsiveGrid cols={{ sm: 1, md: 2, lg: 3 }} gap="3">
            {Array.from({ length: count }, (_, i) => (
              <GridItem key={i}>Item {i + 1}</GridItem>
            ))}
          </ResponsiveGrid>
        </div>
      ))}
    </div>
  ),
};

export const CardGrid: Story = {
  args: {
    cols: { sm: 1, md: 2, lg: 3 },
    gap: '6',
    children: Array.from({ length: 6 }, (_, i) => (
      <div key={i} className="bg-card border rounded-lg p-6 shadow-sm">
        <div className="bg-primary/10 w-12 h-12 rounded-lg mb-4 flex items-center justify-center">
          <span className="text-primary font-bold">{i + 1}</span>
        </div>
        <h3 className="font-semibold mb-2">Feature {i + 1}</h3>
        <p className="text-muted-foreground text-sm">
          This is a sample card in the responsive grid layout.
        </p>
      </div>
    )),
  },
};

export const SemanticElements: Story = {
  render: () => (
    <div className="space-y-4">
      <ResponsiveGrid as="section" cols={2} gap="4" className="border border-border p-4 rounded">
        <GridItem>&lt;section&gt; grid</GridItem>
        <GridItem>Grid item</GridItem>
      </ResponsiveGrid>
      <ResponsiveGrid as="article" cols={3} gap="3" className="border border-border p-4 rounded">
        <GridItem>&lt;article&gt; grid</GridItem>
        <GridItem>Article content</GridItem>
        <GridItem>More content</GridItem>
      </ResponsiveGrid>
    </div>
  ),
};

export const LargeDataset: Story = {
  args: {
    cols: { sm: 2, md: 3, lg: 4, xl: 5 },
    gap: '3',
    children: Array.from({ length: 50 }, (_, i) => (
      <GridItem key={i} className="h-20">
        <strong>{i + 1}</strong>
        <p className="text-xs mt-1">Large dataset</p>
      </GridItem>
    )),
  },
};

export const NestedGrids: Story = {
  args: {
    cols: { sm: 1, md: 2 },
    gap: '6',
    children: (
      <>
        <div className="bg-muted p-4 rounded">
          <h3 className="font-semibold mb-4">Nested Grid 1</h3>
          <ResponsiveGrid cols={2} gap="2">
            <GridItem className="bg-background">A</GridItem>
            <GridItem className="bg-background">B</GridItem>
            <GridItem className="bg-background">C</GridItem>
            <GridItem className="bg-background">D</GridItem>
          </ResponsiveGrid>
        </div>
        <div className="bg-accent p-4 rounded">
          <h3 className="font-semibold mb-4">Nested Grid 2</h3>
          <ResponsiveGrid cols={3} gap="2">
            <GridItem className="bg-background">1</GridItem>
            <GridItem className="bg-background">2</GridItem>
            <GridItem className="bg-background">3</GridItem>
          </ResponsiveGrid>
        </div>
      </>
    ),
  },
};