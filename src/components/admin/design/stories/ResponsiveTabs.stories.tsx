import type { Meta, StoryObj } from '@storybook/react';
import { ResponsiveTabs } from '../components/layouts/ResponsiveTabs';
import { useState } from 'react';

const meta: Meta<typeof ResponsiveTabs> = {
  title: 'Layout/ResponsiveTabs',
  component: ResponsiveTabs,
  parameters: {
    layout: 'fullscreen',
  },
  tags: ['autodocs'],
  argTypes: {
    orientation: {
      control: 'select',
      options: ['horizontal', 'vertical', 'responsive'],
      description: 'Tab orientation',
    },
    breakpoint: {
      control: 'select',
      options: ['sm', 'md', 'lg', 'xl'],
      description: 'Breakpoint for responsive orientation',
    },
    variant: {
      control: 'select',
      options: ['default', 'pills', 'underline'],
      description: 'Tab visual variant',
    },
    spacing: {
      control: 'object',
      description: 'Responsive spacing between tabs and content',
    },
    defaultValue: {
      control: 'text',
      description: 'Default active tab',
    },
  },
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
    tabs: [
      { value: 'tab1', label: 'First Tab' },
      { value: 'tab2', label: 'Second Tab' },
      { value: 'tab3', label: 'Third Tab' },
    ],
    children: (
      <>
        <TabContent title="First Tab">
          <p>This is the content for the first tab. It demonstrates the default horizontal layout.</p>
        </TabContent>
        <TabContent title="Second Tab">
          <p>This is the second tab's content. Notice how the content changes when you switch tabs.</p>
        </TabContent>
        <TabContent title="Third Tab">
          <p>And this is the third tab. The tabs component maintains state automatically.</p>
        </TabContent>
      </>
    ),
  },
};

export const ResponsiveOrientation: Story = {
  args: {
    orientation: 'responsive',
    breakpoint: 'md',
    defaultValue: 'overview',
    spacing: { sm: '4', md: '6' },
    tabs: [
      { value: 'overview', label: 'Overview' },
      { value: 'analytics', label: 'Analytics' },
      { value: 'settings', label: 'Settings' },
      { value: 'team', label: 'Team' },
    ],
    children: (
      <>
        <TabContent title="Overview">
          <p>Vertical on mobile, horizontal on md+</p>
          <p className="text-sm text-muted-foreground mt-2">Resize the viewport to see orientation change.</p>
        </TabContent>
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
        <TabContent title="Team">
          <div className="space-y-3">
            {['Alice Johnson', 'Bob Smith', 'Carol Brown'].map((name) => (
              <div key={name} className="flex items-center gap-3 p-2 bg-card rounded">
                <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center text-primary-foreground font-semibold">
                  {name[0]}
                </div>
                <span>{name}</span>
              </div>
            ))}
          </div>
        </TabContent>
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

export const TabVariants: Story = {
  render: () => (
    <div className="space-y-8">
      {(['default', 'pills', 'underline'] as const).map((variant) => (
        <div key={variant} className="border border-border p-6 rounded">
          <h3 className="font-semibold mb-4">Variant: "{variant}"</h3>
          <ResponsiveTabs
            variant={variant}
            defaultValue="tab1"
            tabs={[
              { value: 'tab1', label: 'Design' },
              { value: 'tab2', label: 'Development' },
              { value: 'tab3', label: 'Testing' },
            ]}
          >
            <TabContent title={`${variant} Design`}>
              <p>Design phase content with {variant} styling.</p>
            </TabContent>
            <TabContent title={`${variant} Development`}>
              <p>Development phase content with {variant} styling.</p>
            </TabContent>
            <TabContent title={`${variant} Testing`}>
              <p>Testing phase content with {variant} styling.</p>
            </TabContent>
          </ResponsiveTabs>
        </div>
      ))}
    </div>
  ),
};

export const VerticalOrientation: Story = {
  args: {
    orientation: 'vertical',
    defaultValue: 'profile',
    spacing: '6',
    tabs: [
      { value: 'profile', label: 'Profile' },
      { value: 'account', label: 'Account' },
      { value: 'notifications', label: 'Notifications' },
      { value: 'privacy', label: 'Privacy' },
    ],
    children: (
      <>
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
        <TabContent title="Notification Settings">
          <div className="space-y-4">
            {['Email notifications', 'Push notifications', 'SMS notifications'].map((setting) => (
              <div key={setting} className="flex items-center justify-between">
                <span>{setting}</span>
                <input type="checkbox" className="rounded" />
              </div>
            ))}
          </div>
        </TabContent>
        <TabContent title="Privacy Settings">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span>Profile visibility</span>
              <select className="border rounded px-2 py-1">
                <option>Public</option>
                <option>Friends only</option>
                <option>Private</option>
              </select>
            </div>
            <div className="flex items-center justify-between">
              <span>Show online status</span>
              <input type="checkbox" className="rounded" />
            </div>
          </div>
        </TabContent>
      </>
    ),
  },
};

export const ManyTabs: Story = {
  args: {
    defaultValue: 'tab1',
    tabs: Array.from({ length: 12 }, (_, i) => ({
      value: `tab${i + 1}`,
      label: `Tab ${i + 1}`,
    })),
    children: Array.from({ length: 12 }, (_, i) => (
      <TabContent key={i} title={`Tab ${i + 1} Content`}>
        <p>This is the content for tab {i + 1}. Even with many tabs, the component remains performant.</p>
        <p className="text-sm text-muted-foreground mt-2">Tab index: {i + 1}</p>
      </TabContent>
    )),
  },
};

export const LongTabLabels: Story = {
  args: {
    defaultValue: 'long1',
    tabs: [
      { value: 'long1', label: 'Very Long Tab Label That Might Wrap' },
      { value: 'long2', label: 'Another Extremely Long Tab Label' },
      { value: 'long3', label: 'Short' },
      { value: 'long4', label: 'Medium Length Tab' },
    ],
    children: (
      <>
        <TabContent title="Long Label Tab 1">
          <p>Content for the first tab with a very long label.</p>
        </TabContent>
        <TabContent title="Long Label Tab 2">
          <p>Content for the second tab with another long label.</p>
        </TabContent>
        <TabContent title="Short Tab">
          <p>Content for the short tab.</p>
        </TabContent>
        <TabContent title="Medium Tab">
          <p>Content for the medium length tab.</p>
        </TabContent>
      </>
    ),
  },
};

export const ControlledTabs: Story = {
  render: () => {
    const [activeTab, setActiveTab] = useState('controlled1');
    const [externalCounter, setExternalCounter] = useState(0);

    return (
      <div className="space-y-4">
        <div className="flex gap-4 items-center">
          <button
            onClick={() => setActiveTab('controlled2')}
            className="bg-primary text-primary-foreground px-4 py-2 rounded"
          >
            Switch to Tab 2
          </button>
          <button
            onClick={() => setExternalCounter(c => c + 1)}
            className="bg-secondary text-secondary-foreground px-4 py-2 rounded"
          >
            Counter: {externalCounter}
          </button>
        </div>
        
        <ResponsiveTabs
          value={activeTab}
          onValueChange={setActiveTab}
          tabs={[
            { value: 'controlled1', label: 'Controlled Tab 1' },
            { value: 'controlled2', label: 'Controlled Tab 2' },
            { value: 'controlled3', label: 'Controlled Tab 3' },
          ]}
        >
          <TabContent title="Controlled Tab 1">
            <p>This tab is controlled externally. Current counter: {externalCounter}</p>
            <p>Active tab: {activeTab}</p>
          </TabContent>
          <TabContent title="Controlled Tab 2">
            <p>You can switch to this tab using the external button above.</p>
            <p>Counter value: {externalCounter}</p>
          </TabContent>
          <TabContent title="Controlled Tab 3">
            <p>Third tab in the controlled example.</p>
            <p>External state: {externalCounter}</p>
          </TabContent>
        </ResponsiveTabs>
      </div>
    );
  },
};

export const NestedTabs: Story = {
  args: {
    defaultValue: 'main1',
    tabs: [
      { value: 'main1', label: 'Dashboard' },
      { value: 'main2', label: 'Reports' },
    ],
    children: (
      <>
        <TabContent title="Dashboard">
          <p className="mb-4">Main dashboard with nested tabs:</p>
          <ResponsiveTabs
            defaultValue='nested1'
            variant="pills"
            tabs={[
              { value: 'nested1', label: 'Overview' },
              { value: 'nested2', label: 'Metrics' },
            ]}
          >
            <div className="bg-card border p-4 rounded">
              <h4 className="font-semibold">Dashboard Overview</h4>
              <p>This is nested tab content within the main dashboard.</p>
            </div>
            <div className="bg-card border p-4 rounded">
              <h4 className="font-semibold">Dashboard Metrics</h4>
              <p>Detailed metrics view in the nested tabs.</p>
            </div>
          </ResponsiveTabs>
        </TabContent>
        <TabContent title="Reports">
          <p>Reports section without nested tabs.</p>
        </TabContent>
      </>
    ),
  },
};