import React from 'react';
import { UnifiedAppLayout } from '@/components/layout/UnifiedAppLayout';
import { SettingsSidebar } from '@/components/layout/SettingsSidebar';
import { ResponsiveContainer, ResponsiveGrid, LayoutItem, ResponsiveFlex } from '@/components/admin/design/components/layouts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import AdminDesignComponents from './AdminDesignComponents';

export default function AdminDesignComponentsPage() {
  return (
    <UnifiedAppLayout sidebar={<SettingsSidebar />}>
      <ResponsiveContainer className="space-y-6" center={true}>
        {/* Enhanced Component Library Overview */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold tracking-tight">Design Components</h1>
              <p className="text-muted-foreground">
                Comprehensive component library with responsive layouts and professional design patterns
              </p>
            </div>
            <Badge variant="secondary">6 Component Types</Badge>
          </div>

          {/* Component Preview Grid */}
          <ResponsiveGrid cols={{ sm: '1', md: '2', lg: '3' }} gap="6">
            <LayoutItem>
              <Card className="h-full">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    ResponsiveContainer
                    <Badge variant="outline">Layout</Badge>
                  </CardTitle>
                  <CardDescription>
                    Adaptive container with responsive padding and max-width constraints
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <ResponsiveContainer className="p-4 bg-muted rounded border-2 border-dashed">
                    <p className="text-center text-sm">Responsive Container Demo</p>
                  </ResponsiveContainer>
                  <code className="text-xs bg-muted p-2 rounded block">
                    {'<ResponsiveContainer maxWidth="lg" padding="4">'}
                  </code>
                </CardContent>
              </Card>
            </LayoutItem>

            <LayoutItem>
              <Card className="h-full">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    ResponsiveFlex
                    <Badge variant="outline">Layout</Badge>
                  </CardTitle>
                  <CardDescription>
                    Flexible layout component with responsive direction and spacing
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <ResponsiveFlex gap="2" className="bg-muted p-4 rounded border-2 border-dashed">
                    <div className="bg-primary text-primary-foreground p-2 rounded text-xs">Item 1</div>
                    <div className="bg-primary text-primary-foreground p-2 rounded text-xs">Item 2</div>
                    <div className="bg-primary text-primary-foreground p-2 rounded text-xs">Item 3</div>
                  </ResponsiveFlex>
                  <code className="text-xs bg-muted p-2 rounded block">
                    {'<ResponsiveFlex gap="4" direction="responsive">'}
                  </code>
                </CardContent>
              </Card>
            </LayoutItem>

            <LayoutItem>
              <Card className="h-full">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    ResponsiveGrid
                    <Badge variant="outline">Layout</Badge>
                  </CardTitle>
                  <CardDescription>
                    CSS Grid system with responsive column definitions
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <ResponsiveGrid cols={{ sm: '1', md: '2' }} gap="2" className="bg-muted p-4 rounded border-2 border-dashed">
                    <div className="bg-primary text-primary-foreground p-2 rounded text-xs text-center">A</div>
                    <div className="bg-primary text-primary-foreground p-2 rounded text-xs text-center">B</div>
                    <div className="bg-primary text-primary-foreground p-2 rounded text-xs text-center">C</div>
                    <div className="bg-primary text-primary-foreground p-2 rounded text-xs text-center">D</div>
                  </ResponsiveGrid>
                  <code className="text-xs bg-muted p-2 rounded block">
                    {'<ResponsiveGrid cols={{ sm: "1", md: "2", lg: "4" }}>'}
                  </code>
                </CardContent>
              </Card>
            </LayoutItem>

            <LayoutItem>
              <Card className="h-full">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    LayoutItem
                    <Badge variant="outline">Wrapper</Badge>
                  </CardTitle>
                  <CardDescription>
                    Individual grid item with semantic HTML and accessibility features
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <LayoutItem className="bg-muted p-4 rounded border-2 border-dashed">
                    <h3 className="font-semibold text-sm">Layout Item</h3>
                    <p className="text-xs text-muted-foreground">Semantic wrapper for grid items</p>
                  </LayoutItem>
                  <code className="text-xs bg-muted p-2 rounded block">
                    {'<LayoutItem className="custom-styles">'}
                  </code>
                </CardContent>
              </Card>
            </LayoutItem>

            <LayoutItem>
              <Card className="h-full">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    ResponsiveTabs
                    <Badge variant="outline">Navigation</Badge>
                  </CardTitle>
                  <CardDescription>
                    Tabbed interface with mobile-friendly scrolling and equal width options
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="bg-muted p-4 rounded border-2 border-dashed">
                    <div className="flex gap-1 mb-2">
                      <Button size="sm" variant="default">Tab 1</Button>
                      <Button size="sm" variant="ghost">Tab 2</Button>
                      <Button size="sm" variant="ghost">Tab 3</Button>
                    </div>
                    <p className="text-xs">Tab content area with responsive behavior</p>
                  </div>
                  <code className="text-xs bg-muted p-2 rounded block">
                    {'<ResponsiveTabs variant="underline" equalWidth>'}
                  </code>
                </CardContent>
              </Card>
            </LayoutItem>

            <LayoutItem>
              <Card className="h-full">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    AdaptiveSection
                    <Badge variant="outline">Container</Badge>
                  </CardTitle>
                  <CardDescription>
                    Smart section component that adapts layout based on content and screen size
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="bg-muted p-4 rounded border-2 border-dashed space-y-2">
                    <h3 className="font-semibold text-sm">Adaptive Section</h3>
                    <p className="text-xs">Automatically adjusts spacing and layout patterns</p>
                    <div className="grid grid-cols-2 gap-2">
                      <div className="bg-background p-2 rounded text-xs">Content A</div>
                      <div className="bg-background p-2 rounded text-xs">Content B</div>
                    </div>
                  </div>
                  <code className="text-xs bg-muted p-2 rounded block">
                    {'<AdaptiveSection spacing="lg" alignment="center">'}
                  </code>
                </CardContent>
              </Card>
            </LayoutItem>
          </ResponsiveGrid>

          {/* Usage Examples Section */}
          <div className="space-y-4 pt-6 border-t">
            <h2 className="text-2xl font-semibold">Implementation Examples</h2>
            <ResponsiveGrid cols={{ sm: '1', lg: '2' }} gap="6">
              <Card>
                <CardHeader>
                  <CardTitle>2-4 Column Dashboard Layout</CardTitle>
                  <CardDescription>Interface → Text pattern with scrolling panes</CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveGrid cols={{ sm: '1', md: '2', lg: '4' }} gap="2" className="mb-4">
                    <div className="bg-primary/10 p-3 rounded text-xs font-medium">Inbox List</div>
                    <div className="bg-primary/10 p-3 rounded text-xs font-medium">Conversation</div>
                    <div className="bg-primary/10 p-3 rounded text-xs font-medium">Details</div>
                    <div className="bg-primary/10 p-3 rounded text-xs font-medium">Actions</div>
                  </ResponsiveGrid>
                  <code className="text-xs bg-muted p-2 rounded block">
                    Perfect for dashboard interfaces with multiple data panes
                  </code>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Mobile-First Responsive Design</CardTitle>
                  <CardDescription>Automatic stacking and overflow handling</CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveFlex direction="responsive" gap="2" className="mb-4">
                    <div className="bg-secondary p-3 rounded text-xs flex-1">Mobile: Stacked</div>
                    <div className="bg-secondary p-3 rounded text-xs flex-1">Desktop: Row</div>
                  </ResponsiveFlex>
                  <code className="text-xs bg-muted p-2 rounded block">
                    Handles &#60;640px overflow with flex-wrap and scrolling
                  </code>
                </CardContent>
              </Card>
            </ResponsiveGrid>
          </div>
        </div>

        {/* Original AdminDesignComponents content */}
        <div className="border-t pt-6">
          <AdminDesignComponents />
        </div>
      </ResponsiveContainer>
    </UnifiedAppLayout>
  );
}