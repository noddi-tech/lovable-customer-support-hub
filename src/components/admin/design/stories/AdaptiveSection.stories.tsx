import type { Meta, StoryObj } from '@storybook/react';
import { AdaptiveSection } from '../components/layouts/AdaptiveSection';

const meta: Meta<typeof AdaptiveSection> = {
  title: 'Layout/AdaptiveSection',
  component: AdaptiveSection,
  parameters: {
    layout: 'fullscreen',
  },
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof meta>;

const SectionChild = ({ children }: { children: React.ReactNode }) => (
  <div className="bg-muted p-4 rounded border-2 border-dashed border-border">
    {children}
  </div>
);

export const Default: Story = {
  args: {
    children: (
      <>
        <SectionChild>
          <h3 className="font-semibold">First Item</h3>
          <p>Default y-direction spacing</p>
        </SectionChild>
        <SectionChild>
          <h3 className="font-semibold">Second Item</h3>
          <p>Children are spaced vertically</p>
        </SectionChild>
        <SectionChild>
          <h3 className="font-semibold">Third Item</h3>
          <p>Clean, consistent spacing</p>
        </SectionChild>
      </>
    ),
  },
};

export const ResponsiveSpacing: Story = {
  args: {
    direction: 'y',
    spacing: { sm: '2', md: '4', lg: '6', xl: '8' },
    children: (
      <>
        <SectionChild>
          <strong>Responsive Spacing</strong>
          <p className="text-sm mt-1">Spacing increases with viewport size</p>
        </SectionChild>
        <SectionChild>
          <strong>Second Item</strong>
          <p className="text-sm mt-1">Resize to see changes</p>
        </SectionChild>
      </>
    ),
  },
};

export const VisualProperties: Story = {
  args: {
    background: 'card',
    border: true,
    rounded: true,
    shadow: 'md',
    padding: '6',
    spacing: '4',
    children: (
      <>
        <SectionChild>
          <strong>Styled Section</strong>
          <p>With background, border, rounded corners, and shadow</p>
        </SectionChild>
        <SectionChild>
          <strong>Consistent Theming</strong>
          <p>Uses design system tokens</p>
        </SectionChild>
      </>
    ),
  },
};