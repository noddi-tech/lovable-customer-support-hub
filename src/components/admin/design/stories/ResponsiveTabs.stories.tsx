import type { Meta, StoryObj } from '@storybook/react';
import { ResponsiveTabs } from '../components/layouts/ResponsiveTabs';

const meta: Meta<typeof ResponsiveTabs> = {
  title: 'Layout/ResponsiveTabs',
  component: ResponsiveTabs,
  parameters: {
    layout: 'fullscreen',
  },
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof meta>;

const TabContent = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <div className="bg-muted p-6 rounded border-2 border-dashed border-border">
    <h3 className="text-lg font-semibold mb-3">{title}</h3>
    {children}
  </div>
);

export const Default: Story = {
  args: {
    defaultValue: 'tab1',
    items: [
      {
        value: 'tab1',
        label: 'First Tab',
        content: (
          <TabContent title="First Tab">
            <p>This is the content for the first tab. It demonstrates the default horizontal layout.</p>
          </TabContent>
        ),
      },
      {
        value: 'tab2',
        label: 'Second Tab',
        content: (
          <TabContent title="Second Tab">
            <p>This is the second tab's content. Notice how the content changes when you switch tabs.</p>
          </TabContent>
        ),
      },
      {
        value: 'tab3',
        label: 'Third Tab',
        content: (
          <TabContent title="Third Tab">
            <p>And this is the third tab. The tabs component maintains state automatically.</p>
          </TabContent>
        ),
      },
    ],
  },
};

export const ResponsiveOrientation: Story = {
  args: {
    orientation: 'responsive',
    breakpoint: 'md',
    defaultValue: 'overview',
    spacing: { sm: '4', md: '6' },
    items: [
      {
        value: 'overview',
        label: 'Overview',
        content: (
          <TabContent title="Overview">
            <p>Vertical on mobile, horizontal on md+</p>
            <p className="text-sm text-muted-foreground mt-2">Resize the viewport to see orientation change.</p>
          </TabContent>
        ),
      },
      {
        value: 'analytics',
        label: 'Analytics',
        content: (
          <TabContent title="Analytics">
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-card p-4 rounded">
                <h4 className="font-semibold">Views</h4>
                <p className="text-2xl font-bold">1,234</p>
              </div>
              <div className="bg-card p-4 rounded">
                <h4 className="font-semibold">Users</h4>
                <p className="text-2xl font-bold">567</p>
              </div>
            </div>
          </TabContent>
        ),
      },
      {
        value: 'settings',
        label: 'Settings',
        content: (
          <TabContent title="Settings">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span>Email notifications</span>
                <button className="bg-primary text-primary-foreground px-3 py-1 rounded">Toggle</button>
              </div>
              <div className="flex items-center justify-between">
                <span>Dark mode</span>
                <button className="bg-primary text-primary-foreground px-3 py-1 rounded">Toggle</button>
              </div>
            </div>
          </TabContent>
        ),
      },
    ],
  },
};

export const VerticalOrientation: Story = {
  args: {
    orientation: 'vertical',
    defaultValue: 'profile',
    spacing: '6',
    items: [
      {
        value: 'profile',
        label: 'Profile',
        content: (
          <TabContent title="Profile Settings">
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Display Name</label>
                <input className="w-full p-2 border rounded" defaultValue="John Doe" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Bio</label>
                <textarea className="w-full p-2 border rounded h-24" placeholder="Tell us about yourself..." />
              </div>
            </div>
          </TabContent>
        ),
      },
      {
        value: 'account',
        label: 'Account',
        content: (
          <TabContent title="Account Settings">
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Email</label>
                <input className="w-full p-2 border rounded" defaultValue="john@example.com" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Password</label>
                <button className="bg-primary text-primary-foreground px-4 py-2 rounded">Change Password</button>
              </div>
            </div>
          </TabContent>
        ),
      },
    ],
  },
};

export const TabVariants: Story = {
  render: () => (
    <div className="space-y-8">
      {(['default', 'pills', 'underline'] as const).map((variant) => (
        <div key={variant} className="border border-border p-6 rounded">
          <h3 className="font-semibold mb-4">Variant: "{variant}"</h3>
          <ResponsiveTabs
            variant={variant}
            defaultValue="tab1"
            items={[
              {
                value: 'tab1',
                label: 'Design',
                content: (
                  <TabContent title={`${variant} Design`}>
                    <p>Design phase content with {variant} styling.</p>
                  </TabContent>
                ),
              },
              {
                value: 'tab2',
                label: 'Development',
                content: (
                  <TabContent title={`${variant} Development`}>
                    <p>Development phase content with {variant} styling.</p>
                  </TabContent>
                ),
              },
            ]}
          />
        </div>
      ))}
    </div>
  ),
};