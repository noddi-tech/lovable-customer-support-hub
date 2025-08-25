import type { Meta, StoryObj } from '@storybook/react';
import { ResponsiveTabs, ResponsiveTabsList, ResponsiveTabsTrigger, ResponsiveTabsContent } from '../components/layouts';
import { Mail, MessageSquare, Phone, Settings, Shield, Palette, Database, Users, Bell } from 'lucide-react';

const meta: Meta<typeof ResponsiveTabs> = {
  title: 'Layout/ResponsiveTabs',
  component: ResponsiveTabs,
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component: 'A responsive tab component that adapts to different screen sizes with multiple styling variants.',
      },
    },
  },
  argTypes: {
    variant: {
      control: 'select',
      options: ['default', 'pills', 'underline', 'borderless', 'compact'],
      description: 'Visual style variant',
    },
    size: {
      control: 'select',
      options: ['sm', 'md', 'lg'],
      description: 'Size of tabs',
    },
    equalWidth: {
      control: 'boolean',
      description: 'Whether tabs should have equal width',
    },
    justifyContent: {
      control: 'select',
      options: ['start', 'center', 'end', 'between'],
      description: 'Alignment of tabs',
    },
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
  },
};

export default meta;
type Story = StoryObj<typeof ResponsiveTabs>;

// Basic example
export const Default: Story = {
  args: {
    defaultValue: 'general',
    variant: 'default',
    size: 'md',
    equalWidth: false,
    justifyContent: 'start',
  },
  render: (args) => (
    <div className="p-6 max-w-4xl mx-auto">
      <ResponsiveTabs {...args}>
        <ResponsiveTabsList>
          <ResponsiveTabsTrigger value="general" className="flex items-center gap-2">
            <Settings className="w-4 h-4" />
            General
          </ResponsiveTabsTrigger>
          <ResponsiveTabsTrigger value="security" className="flex items-center gap-2">
            <Shield className="w-4 h-4" />
            Security
          </ResponsiveTabsTrigger>
          <ResponsiveTabsTrigger value="appearance" className="flex items-center gap-2">
            <Palette className="w-4 h-4" />
            Appearance
          </ResponsiveTabsTrigger>
        </ResponsiveTabsList>
        <ResponsiveTabsContent value="general" className="mt-6">
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">General Settings</h3>
            <p className="text-muted-foreground">
              Configure your general application settings, including language, timezone, and basic preferences.
            </p>
            <div className="p-4 bg-muted/50 rounded-lg">
              <p>General settings form would go here...</p>
            </div>
          </div>
        </ResponsiveTabsContent>
        <ResponsiveTabsContent value="security" className="mt-6">
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Security Settings</h3>
            <p className="text-muted-foreground">
              Manage your security preferences, including two-factor authentication and password policies.
            </p>
            <div className="p-4 bg-muted/50 rounded-lg">
              <p>Security settings form would go here...</p>
            </div>
          </div>
        </ResponsiveTabsContent>
        <ResponsiveTabsContent value="appearance" className="mt-6">
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Appearance Settings</h3>
            <p className="text-muted-foreground">
              Customize the look and feel of your application, including themes and layout preferences.
            </p>
            <div className="p-4 bg-muted/50 rounded-lg">
              <p>Appearance settings form would go here...</p>
            </div>
          </div>
        </ResponsiveTabsContent>
      </ResponsiveTabs>
    </div>
  ),
};

// Pills variant
export const Pills: Story = {
  args: {
    defaultValue: 'email',
    variant: 'pills',
    size: 'md',
    equalWidth: true,
    justifyContent: 'center',
  },
  render: (args) => (
    <div className="p-6 max-w-4xl mx-auto">
      <ResponsiveTabs {...args}>
        <ResponsiveTabsList className="bg-card/50 backdrop-blur-sm shadow-sm">
          <ResponsiveTabsTrigger value="email" className="flex items-center gap-2">
            <Mail className="w-4 h-4" />
            Email
          </ResponsiveTabsTrigger>
          <ResponsiveTabsTrigger value="sms" className="flex items-center gap-2">
            <MessageSquare className="w-4 h-4" />
            SMS
          </ResponsiveTabsTrigger>
          <ResponsiveTabsTrigger value="voice" className="flex items-center gap-2">
            <Phone className="w-4 h-4" />
            Voice
          </ResponsiveTabsTrigger>
        </ResponsiveTabsList>
        <ResponsiveTabsContent value="email" className="mt-6">
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Email Integration</h3>
            <p className="text-muted-foreground">
              Configure email settings, SMTP servers, and email templates.
            </p>
            <div className="p-4 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/50 dark:to-indigo-950/50 rounded-lg border">
              <p>Email configuration interface would go here...</p>
            </div>
          </div>
        </ResponsiveTabsContent>
        <ResponsiveTabsContent value="sms" className="mt-6">
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">SMS Integration</h3>
            <p className="text-muted-foreground">
              Set up SMS providers like Twilio, configure message templates, and manage phone numbers.
            </p>
            <div className="p-4 bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-950/50 dark:to-emerald-950/50 rounded-lg border">
              <p>SMS configuration interface would go here...</p>
            </div>
          </div>
        </ResponsiveTabsContent>
        <ResponsiveTabsContent value="voice" className="mt-6">
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Voice Integration</h3>
            <p className="text-muted-foreground">
              Configure voice providers, set up call routing, and manage telephony settings.
            </p>
            <div className="p-4 bg-gradient-to-r from-purple-50 to-violet-50 dark:from-purple-950/50 dark:to-violet-950/50 rounded-lg border">
              <p>Voice configuration interface would go here...</p>
            </div>
          </div>
        </ResponsiveTabsContent>
      </ResponsiveTabs>
    </div>
  ),
};

// Underline variant
export const Underline: Story = {
  args: {
    defaultValue: 'overview',
    variant: 'underline',
    size: 'md',
    equalWidth: false,
    justifyContent: 'start',
  },
  render: (args) => (
    <div className="p-6 max-w-4xl mx-auto">
      <ResponsiveTabs {...args}>
        <ResponsiveTabsList>
          <ResponsiveTabsTrigger value="overview">Overview</ResponsiveTabsTrigger>
          <ResponsiveTabsTrigger value="analytics">Analytics</ResponsiveTabsTrigger>
          <ResponsiveTabsTrigger value="reports">Reports</ResponsiveTabsTrigger>
          <ResponsiveTabsTrigger value="export">Export</ResponsiveTabsTrigger>
        </ResponsiveTabsList>
        <ResponsiveTabsContent value="overview" className="mt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="p-4 bg-card border rounded-lg">
              <h4 className="font-semibold mb-2">Total Users</h4>
              <p className="text-2xl font-bold text-primary">1,234</p>
            </div>
            <div className="p-4 bg-card border rounded-lg">
              <h4 className="font-semibold mb-2">Active Sessions</h4>
              <p className="text-2xl font-bold text-green-600">456</p>
            </div>
            <div className="p-4 bg-card border rounded-lg">
              <h4 className="font-semibold mb-2">Revenue</h4>
              <p className="text-2xl font-bold text-blue-600">$12,345</p>
            </div>
          </div>
        </ResponsiveTabsContent>
        <ResponsiveTabsContent value="analytics" className="mt-6">
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Analytics Dashboard</h3>
            <div className="p-8 bg-muted/30 rounded-lg border-2 border-dashed border-muted">
              <p className="text-center text-muted-foreground">Analytics charts would be displayed here...</p>
            </div>
          </div>
        </ResponsiveTabsContent>
        <ResponsiveTabsContent value="reports" className="mt-6">
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Generated Reports</h3>
            <div className="p-8 bg-muted/30 rounded-lg border-2 border-dashed border-muted">
              <p className="text-center text-muted-foreground">Reports list would be displayed here...</p>
            </div>
          </div>
        </ResponsiveTabsContent>
        <ResponsiveTabsContent value="export" className="mt-6">
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Export Data</h3>
            <div className="p-8 bg-muted/30 rounded-lg border-2 border-dashed border-muted">
              <p className="text-center text-muted-foreground">Export options would be displayed here...</p>
            </div>
          </div>
        </ResponsiveTabsContent>
      </ResponsiveTabs>
    </div>
  ),
};

// Borderless variant
export const Borderless: Story = {
  args: {
    defaultValue: 'users',
    variant: 'borderless',
    size: 'md',
    equalWidth: false,
    justifyContent: 'start',
  },
  render: (args) => (
    <div className="p-6 max-w-4xl mx-auto">
      <ResponsiveTabs {...args}>
        <ResponsiveTabsList>
          <ResponsiveTabsTrigger value="users" className="flex items-center gap-2">
            <Users className="w-4 h-4" />
            Users
          </ResponsiveTabsTrigger>
          <ResponsiveTabsTrigger value="database" className="flex items-center gap-2">
            <Database className="w-4 h-4" />
            Database
          </ResponsiveTabsTrigger>
          <ResponsiveTabsTrigger value="notifications" className="flex items-center gap-2">
            <Bell className="w-4 h-4" />
            Notifications
          </ResponsiveTabsTrigger>
        </ResponsiveTabsList>
        <ResponsiveTabsContent value="users" className="mt-6">
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">User Management</h3>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse border border-muted">
                <thead>
                  <tr className="bg-muted/50">
                    <th className="border border-muted p-2 text-left">Name</th>
                    <th className="border border-muted p-2 text-left">Email</th>
                    <th className="border border-muted p-2 text-left">Role</th>
                    <th className="border border-muted p-2 text-left">Status</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td className="border border-muted p-2">John Doe</td>
                    <td className="border border-muted p-2">john@example.com</td>
                    <td className="border border-muted p-2">Admin</td>
                    <td className="border border-muted p-2">Active</td>
                  </tr>
                  <tr>
                    <td className="border border-muted p-2">Jane Smith</td>
                    <td className="border border-muted p-2">jane@example.com</td>
                    <td className="border border-muted p-2">User</td>
                    <td className="border border-muted p-2">Active</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </ResponsiveTabsContent>
        <ResponsiveTabsContent value="database" className="mt-6">
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Database Status</h3>
            <div className="p-4 bg-muted/50 rounded-lg">
              <p>Database connection and status information would go here...</p>
            </div>
          </div>
        </ResponsiveTabsContent>
        <ResponsiveTabsContent value="notifications" className="mt-6">
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Notification Settings</h3>
            <div className="p-4 bg-muted/50 rounded-lg">
              <p>Notification configuration would go here...</p>
            </div>
          </div>
        </ResponsiveTabsContent>
      </ResponsiveTabs>
    </div>
  ),
};

// Compact variant
export const Compact: Story = {
  args: {
    defaultValue: 'all',
    variant: 'compact',
    size: 'sm',
    equalWidth: true,
    justifyContent: 'start',
  },
  render: (args) => (
    <div className="p-6 max-w-2xl mx-auto">
      <div className="bg-card border rounded-lg p-4">
        <h2 className="text-lg font-semibold mb-4">Filter Options</h2>
        <ResponsiveTabs {...args}>
          <ResponsiveTabsList>
            <ResponsiveTabsTrigger value="all">All</ResponsiveTabsTrigger>
            <ResponsiveTabsTrigger value="active">Active</ResponsiveTabsTrigger>
            <ResponsiveTabsTrigger value="pending">Pending</ResponsiveTabsTrigger>
            <ResponsiveTabsTrigger value="archived">Archived</ResponsiveTabsTrigger>
          </ResponsiveTabsList>
          <ResponsiveTabsContent value="all" className="mt-4">
            <p className="text-sm text-muted-foreground">Showing all items (1,234 items)</p>
          </ResponsiveTabsContent>
          <ResponsiveTabsContent value="active" className="mt-4">
            <p className="text-sm text-muted-foreground">Showing active items (987 items)</p>
          </ResponsiveTabsContent>
          <ResponsiveTabsContent value="pending" className="mt-4">
            <p className="text-sm text-muted-foreground">Showing pending items (123 items)</p>
          </ResponsiveTabsContent>
          <ResponsiveTabsContent value="archived" className="mt-4">
            <p className="text-sm text-muted-foreground">Showing archived items (124 items)</p>
          </ResponsiveTabsContent>
        </ResponsiveTabs>
      </div>
    </div>
  ),
};

// Many tabs example (edge case)
export const ManyTabs: Story = {
  args: {
    defaultValue: 'tab1',
    variant: 'default',
    size: 'sm',
    equalWidth: true,
    justifyContent: 'start',
  },
  render: (args) => (
    <div className="p-6 max-w-6xl mx-auto">
      <h2 className="text-lg font-semibold mb-4">Many Tabs Example (Responsive Wrapping)</h2>
      <ResponsiveTabs {...args}>
        <ResponsiveTabsList>
          {Array.from({ length: 12 }, (_, i) => (
            <ResponsiveTabsTrigger key={i + 1} value={`tab${i + 1}`}>
              Tab {i + 1}
            </ResponsiveTabsTrigger>
          ))}
        </ResponsiveTabsList>
        {Array.from({ length: 12 }, (_, i) => (
          <ResponsiveTabsContent key={i + 1} value={`tab${i + 1}`} className="mt-4">
            <div className="p-4 bg-muted/30 rounded-lg">
              <h3 className="font-semibold mb-2">Content for Tab {i + 1}</h3>
              <p className="text-muted-foreground">
                This demonstrates how the ResponsiveTabs component handles many tabs by wrapping them 
                responsively. On mobile, they stack vertically, and on larger screens, they wrap 
                horizontally when there isn't enough space.
              </p>
            </div>
          </ResponsiveTabsContent>
        ))}
      </ResponsiveTabs>
    </div>
  ),
};

// Vertical orientation
export const VerticalOrientation: Story = {
  args: {
    defaultValue: 'dashboard',
    variant: 'pills',
    size: 'md',
    equalWidth: false,
    justifyContent: 'start',
    orientation: 'vertical',
  },
  render: (args) => (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="md:col-span-1">
          <ResponsiveTabs {...args}>
            <ResponsiveTabsList className="flex-col space-y-1">
              <ResponsiveTabsTrigger value="dashboard" className="w-full justify-start">
                Dashboard
              </ResponsiveTabsTrigger>
              <ResponsiveTabsTrigger value="analytics" className="w-full justify-start">
                Analytics
              </ResponsiveTabsTrigger>
              <ResponsiveTabsTrigger value="settings" className="w-full justify-start">
                Settings
              </ResponsiveTabsTrigger>
              <ResponsiveTabsTrigger value="profile" className="w-full justify-start">
                Profile
              </ResponsiveTabsTrigger>
            </ResponsiveTabsList>
          </ResponsiveTabs>
        </div>
        <div className="md:col-span-3">
          <ResponsiveTabs {...args}>
            <ResponsiveTabsContent value="dashboard">
              <div className="p-6 bg-card border rounded-lg">
                <h3 className="text-lg font-semibold mb-4">Dashboard</h3>
                <p className="text-muted-foreground">Dashboard content goes here...</p>
              </div>
            </ResponsiveTabsContent>
            <ResponsiveTabsContent value="analytics">
              <div className="p-6 bg-card border rounded-lg">
                <h3 className="text-lg font-semibold mb-4">Analytics</h3>
                <p className="text-muted-foreground">Analytics content goes here...</p>
              </div>
            </ResponsiveTabsContent>
            <ResponsiveTabsContent value="settings">
              <div className="p-6 bg-card border rounded-lg">
                <h3 className="text-lg font-semibold mb-4">Settings</h3>
                <p className="text-muted-foreground">Settings content goes here...</p>
              </div>
            </ResponsiveTabsContent>
            <ResponsiveTabsContent value="profile">
              <div className="p-6 bg-card border rounded-lg">
                <h3 className="text-lg font-semibold mb-4">Profile</h3>
                <p className="text-muted-foreground">Profile content goes here...</p>
              </div>
            </ResponsiveTabsContent>
          </ResponsiveTabs>
        </div>
      </div>
    </div>
  ),
};