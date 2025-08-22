import type { Meta, StoryObj } from '@storybook/react';
import { AdaptiveSection } from '../components/layouts/AdaptiveSection';

const meta: Meta<typeof AdaptiveSection> = {
  title: 'Layout/AdaptiveSection',
  component: AdaptiveSection,
  parameters: {
    layout: 'fullscreen',
  },
  tags: ['autodocs'],
  argTypes: {
    direction: {
      control: 'select',
      options: ['x', 'y', 'both'],
      description: 'Spacing direction',
    },
    spacing: {
      control: 'object',
      description: 'Responsive spacing values',
    },
    padding: {
      control: 'object',
      description: 'Responsive padding values',
    },
    margin: {
      control: 'object',
      description: 'Responsive margin values',
    },
    background: {
      control: 'select',
      options: ['none', 'muted', 'card', 'accent'],
      description: 'Background variant',
    },
    border: {
      control: 'boolean',
      description: 'Apply border',
    },
    rounded: {
      control: 'boolean',
      description: 'Apply rounded corners',
    },
    shadow: {
      control: 'select',
      options: ['none', 'sm', 'md', 'lg'],
      description: 'Shadow variant',
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

const SectionChild = ({ children, className = "" }: { children: React.ReactNode; className?: string }) => (
  <div className={`bg-muted p-4 rounded border-2 border-dashed border-border ${className}`}>
    {children}
  </div>
);

export const Default: Story = {
  args: {
    children: (
      <>
        <SectionChild>
          <h3 className="font-semibold">First Item</h3>
          <p>Default y-direction spacing (space-y-4)</p>
        </SectionChild>
        <SectionChild>
          <h3 className="font-semibold">Second Item</h3>
          <p>Children are spaced vertically by default</p>
        </SectionChild>
        <SectionChild>
          <h3 className="font-semibold">Third Item</h3>
          <p>Clean, consistent spacing</p>
        </SectionChild>
      </>
    ),
  },
};

export const SpacingDirections: Story = {
  render: () => (
    <div className="space-y-8">
      {(['y', 'x', 'both'] as const).map((direction) => (
        <div key={direction} className="border border-border p-4 rounded">
          <h3 className="font-semibold mb-4">direction="{direction}"</h3>
          <AdaptiveSection direction={direction} spacing="6" className={direction === 'x' ? 'flex flex-row' : ''}>
            <SectionChild>Item 1</SectionChild>
            <SectionChild>Item 2</SectionChild>
            <SectionChild>Item 3</SectionChild>
          </AdaptiveSection>
        </div>
      ))}
    </div>
  ),
};

export const ResponsiveSpacing: Story = {
  args: {
    direction: 'y',
    spacing: { sm: '2', md: '4', lg: '6', xl: '8' },
    children: (
      <>
        <SectionChild>
          <strong>Responsive Spacing</strong>
          <p className="text-sm mt-1">sm:space-y-2 → md:space-y-4 → lg:space-y-6 → xl:space-y-8</p>
        </SectionChild>
        <SectionChild>
          <strong>Second Item</strong>
          <p className="text-sm mt-1">Spacing increases with viewport size</p>
        </SectionChild>
        <SectionChild>
          <strong>Third Item</strong>
          <p className="text-sm mt-1">Resize to see the changes</p>
        </SectionChild>
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

export const BackgroundVariants: Story = {
  render: () => (
    <div className="space-y-6">
      {(['none', 'muted', 'card', 'accent'] as const).map((background) => (
        <div key={background} className="border border-border p-4 rounded">
          <h3 className="font-semibold mb-4">background="{background}"</h3>
          <AdaptiveSection background={background} padding="6" spacing="4">
            <SectionChild>
              <strong>Child 1</strong>
              <p>Background: {background}</p>
            </SectionChild>
            <SectionChild>
              <strong>Child 2</strong>
              <p>Consistent theming</p>
            </SectionChild>
          </AdaptiveSection>
        </div>
      ))}
    </div>
  ),
};

export const VisualProperties: Story = {
  render: () => (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      <AdaptiveSection
        background="card"
        border={true}
        rounded={true}
        shadow="md"
        padding="6"
        spacing="4"
      >
        <h3 className="font-semibold">With All Properties</h3>
        <SectionChild>Border: ✓</SectionChild>
        <SectionChild>Rounded: ✓</SectionChild>
        <SectionChild>Shadow: md</SectionChild>
        <SectionChild>Background: card</SectionChild>
      </AdaptiveSection>

      <AdaptiveSection
        background="muted"
        padding="6"
        spacing="4"
      >
        <h3 className="font-semibold">Minimal Styling</h3>
        <SectionChild>Border: ✗</SectionChild>
        <SectionChild>Rounded: ✗</SectionChild>
        <SectionChild>Shadow: none</SectionChild>
        <SectionChild>Background: muted</SectionChild>
      </AdaptiveSection>
    </div>
  ),
};

export const ShadowVariants: Story = {
  render: () => (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
      {(['none', 'sm', 'md', 'lg'] as const).map((shadow) => (
        <AdaptiveSection
          key={shadow}
          background="card"
          shadow={shadow}
          padding="4"
          spacing="3"
          rounded={true}
        >
          <h4 className="font-semibold text-center">shadow="{shadow}"</h4>
          <SectionChild className="bg-background">
            <p className="text-sm text-center">Sample content</p>
          </SectionChild>
        </AdaptiveSection>
      ))}
    </div>
  ),
};

export const ResponsivePaddingMargin: Story = {
  args: {
    padding: { sm: '2', md: '4', lg: '6', xl: '8' },
    margin: { sm: '1', md: '2', lg: '4', xl: '6' },
    background: 'muted',
    border: true,
    rounded: true,
    children: (
      <>
        <SectionChild>
          <strong>Responsive Padding & Margin</strong>
          <p className="text-sm mt-1">Both padding and margin scale with viewport</p>
        </SectionChild>
        <SectionChild>
          <strong>Consistent Spacing</strong>
          <p className="text-sm mt-1">Internal and external spacing adapts together</p>
        </SectionChild>
      </>
    ),
  },
};

export const SemanticElements: Story = {
  render: () => (
    <div className="space-y-4">
      <AdaptiveSection as="main" background="card" padding="6" spacing="4" border rounded>
        <h2 className="text-lg font-bold">&lt;main&gt; Section</h2>
        <SectionChild>Main content area</SectionChild>
        <SectionChild>Primary page content</SectionChild>
      </AdaptiveSection>

      <AdaptiveSection as="article" background="muted" padding="4" spacing="3" rounded>
        <h2 className="text-lg font-bold">&lt;article&gt; Section</h2>
        <SectionChild>Article content</SectionChild>
        <SectionChild>Self-contained content</SectionChild>
      </AdaptiveSection>

      <AdaptiveSection as="aside" background="accent" padding="3" spacing="2" border rounded>
        <h2 className="text-lg font-bold">&lt;aside&gt; Section</h2>
        <SectionChild className="bg-background">Sidebar content</SectionChild>
        <SectionChild className="bg-background">Related information</SectionChild>
      </AdaptiveSection>
    </div>
  ),
};

export const NestedSections: Story = {
  args: {
    background: 'card',
    padding: '8',
    spacing: '6',
    border: true,
    rounded: true,
    shadow: 'lg',
    children: (
      <>
        <div>
          <h2 className="text-xl font-bold mb-2">Outer Section</h2>
          <p className="text-muted-foreground">This section contains nested sections</p>
        </div>
        
        <AdaptiveSection
          background="muted"
          padding={{ sm: '4', md: '6' }}
          spacing="4"
          rounded={true}
          border={true}
        >
          <h3 className="font-semibold">Nested Section 1</h3>
          <SectionChild className="bg-background">
            <strong>Child 1</strong>
            <p>Content in nested section</p>
          </SectionChild>
          <SectionChild className="bg-background">
            <strong>Child 2</strong>
            <p>More nested content</p>
          </SectionChild>
        </AdaptiveSection>

        <AdaptiveSection
          background="accent"
          padding="4"
          spacing="3"
          rounded={true}
        >
          <h3 className="font-semibold">Nested Section 2</h3>
          <SectionChild className="bg-background">
            <strong>Different styling</strong>
            <p>Each section can have its own properties</p>
          </SectionChild>
        </AdaptiveSection>
      </>
    ),
  },
};

export const ComplexLayout: Story = {
  render: () => (
    <AdaptiveSection
      background="muted"
      padding={{ sm: '4', md: '6', lg: '8' }}
      spacing={{ sm: '4', md: '6', lg: '8' }}
      rounded={true}
      shadow="md"
    >
      <AdaptiveSection
        background="primary"
        padding="6"
        spacing="0"
        rounded={true}
        className="text-primary-foreground"
      >
        <h1 className="text-2xl font-bold">Dashboard Header</h1>
      </AdaptiveSection>

      <AdaptiveSection
        direction="both"
        spacing="4"
        className="grid grid-cols-1 md:grid-cols-3 gap-4"
      >
        <AdaptiveSection background="card" padding="4" spacing="3" border rounded shadow="sm">
          <h3 className="font-semibold">Metrics</h3>
          <SectionChild className="bg-background">Users: 1,234</SectionChild>
          <SectionChild className="bg-background">Revenue: $5,678</SectionChild>
        </AdaptiveSection>

        <AdaptiveSection background="card" padding="4" spacing="3" border rounded shadow="sm">
          <h3 className="font-semibold">Activity</h3>
          <SectionChild className="bg-background">New signups: 89</SectionChild>
          <SectionChild className="bg-background">Active sessions: 234</SectionChild>
        </AdaptiveSection>

        <AdaptiveSection background="card" padding="4" spacing="3" border rounded shadow="sm">
          <h3 className="font-semibold">Performance</h3>
          <SectionChild className="bg-background">Load time: 1.2s</SectionChild>
          <SectionChild className="bg-background">Uptime: 99.9%</SectionChild>
        </AdaptiveSection>
      </AdaptiveSection>

      <AdaptiveSection
        background="card"
        padding="6"
        spacing="4"
        border={true}
        rounded={true}
        shadow="sm"
      >
        <h3 className="text-lg font-semibold">Recent Activity</h3>
        <SectionChild className="bg-background">User John Doe signed up</SectionChild>
        <SectionChild className="bg-background">New order #12345 received</SectionChild>
        <SectionChild className="bg-background">System backup completed</SectionChild>
      </AdaptiveSection>
    </AdaptiveSection>
  ),
};

export const ManyChildren: Story = {
  args: {
    spacing: { sm: '2', md: '3', lg: '4' },
    padding: '4',
    background: 'muted',
    rounded: true,
    children: Array.from({ length: 15 }, (_, i) => (
      <SectionChild key={i} className="bg-background">
        <strong>Item {i + 1}</strong>
        <p className="text-sm">Content for item number {i + 1}</p>
      </SectionChild>
    )),
  },
};