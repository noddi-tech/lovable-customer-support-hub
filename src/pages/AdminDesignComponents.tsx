import React from 'react';
import { ResponsiveContainer, ResponsiveTabs, ResponsiveTabsList, ResponsiveTabsTrigger, ResponsiveTabsContent, ResponsiveGrid, LayoutItem, ResponsiveFlex, AdaptiveSection } from '@/components/admin/design/components/layouts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Heading } from '@/components/ui/heading';
import { Code, Copy, Eye, Grid, Layout, Layers, Box } from 'lucide-react';

export default function AdminDesignComponents() {
  const componentCategories = [
    {
      id: 'layouts',
      name: 'Layout Components',
      icon: Layout,
      components: [
        {
          name: 'ResponsiveContainer',
          description: 'Wrapper with responsive padding and max-width constraints',
          preview: <ResponsiveContainer className="p-4 bg-primary/10 rounded-md"><div className="text-sm">Responsive Container Content</div></ResponsiveContainer>,
          code: '<ResponsiveContainer className="p-4">\n  <div>Content</div>\n</ResponsiveContainer>'
        },
        {
          name: 'ResponsiveGrid',
          description: 'Grid layout with responsive column configurations',
          preview: (
            <ResponsiveGrid cols={{ sm: '1', md: '2', lg: '3' }} gap="2">
              <div className="bg-secondary p-2 rounded">Item 1</div>
              <div className="bg-secondary p-2 rounded">Item 2</div>
              <div className="bg-secondary p-2 rounded">Item 3</div>
            </ResponsiveGrid>
          ),
          code: '<ResponsiveGrid cols={{ sm: "1", md: "2", lg: "3" }} gap="4">\n  <LayoutItem>Item 1</LayoutItem>\n  <LayoutItem>Item 2</LayoutItem>\n</ResponsiveGrid>'
        },
        {
          name: 'ResponsiveFlex',
          description: 'Flexible row/column layout with responsive direction',
          preview: (
            <ResponsiveFlex gap="2">
              <div className="bg-accent p-2 rounded">Flex Item 1</div>
              <div className="bg-accent p-2 rounded">Flex Item 2</div>
            </ResponsiveFlex>
          ),
          code: '<ResponsiveFlex gap="4">\n  <div>Item 1</div>\n  <div>Item 2</div>\n</ResponsiveFlex>'
        },
        {
          name: 'LayoutItem',
          description: 'Individual grid/flex item with consistent spacing',
          preview: <LayoutItem className="bg-muted p-4 rounded"><div className="text-sm">Layout Item Content</div></LayoutItem>,
          code: '<LayoutItem className="bg-card p-4">\n  <div>Content</div>\n</LayoutItem>'
        },
        {
          name: 'AdaptiveSection',
          description: 'Section wrapper with adaptive spacing and optional dividers',
          preview: (
            <AdaptiveSection spacing="4" className="bg-card/50 p-4 rounded border">
              <div className="text-sm">Section with adaptive spacing</div>
            </AdaptiveSection>
          ),
          code: '<AdaptiveSection spacing="4">\n  <div>Section content</div>\n</AdaptiveSection>'
        }
      ]
    },
    {
      id: 'navigation',
      name: 'Navigation Components',
      icon: Layers,
      components: [
        {
          name: 'ResponsiveTabs',
          description: 'Tab navigation with responsive behavior and multiple variants',
          preview: (
            <ResponsiveTabs defaultValue="tab1" variant="pills" size="sm" equalWidth>
              <ResponsiveTabsList>
                <ResponsiveTabsTrigger value="tab1">Tab 1</ResponsiveTabsTrigger>
                <ResponsiveTabsTrigger value="tab2">Tab 2</ResponsiveTabsTrigger>
              </ResponsiveTabsList>
              <ResponsiveTabsContent value="tab1" className="mt-2">
                <div className="text-sm p-2 bg-muted rounded">Tab 1 Content</div>
              </ResponsiveTabsContent>
              <ResponsiveTabsContent value="tab2" className="mt-2">
                <div className="text-sm p-2 bg-muted rounded">Tab 2 Content</div>
              </ResponsiveTabsContent>
            </ResponsiveTabs>
          ),
          code: '<ResponsiveTabs defaultValue="tab1" variant="pills" equalWidth>\n  <ResponsiveTabsList>\n    <ResponsiveTabsTrigger value="tab1">Tab 1</ResponsiveTabsTrigger>\n  </ResponsiveTabsList>\n  <ResponsiveTabsContent value="tab1">\n    Content\n  </ResponsiveTabsContent>\n</ResponsiveTabs>'
        }
      ]
    }
  ];

  return (
    <ResponsiveContainer className="overflow-y-auto max-h-[calc(100vh-200px)]">
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <Box className="h-6 w-6 text-primary" />
          <Heading level={1} className="text-2xl">Design Components Library</Heading>
          <Badge variant="secondary">v1.0</Badge>
        </div>
        
        <p className="text-muted-foreground">
          Comprehensive collection of responsive layout and navigation components built on top of shadcn/ui and Tailwind CSS.
        </p>

        <ResponsiveTabs defaultValue="layouts" variant="underline" size="md">
          <ResponsiveTabsList className="w-full">
            {componentCategories.map((category) => (
              <ResponsiveTabsTrigger key={category.id} value={category.id} className="flex items-center gap-2">
                <category.icon className="h-4 w-4" />
                {category.name}
              </ResponsiveTabsTrigger>
            ))}
          </ResponsiveTabsList>

          {componentCategories.map((category) => (
            <ResponsiveTabsContent key={category.id} value={category.id} className="mt-6">
              <ResponsiveGrid cols={{ sm: '1', lg: '2' }} gap="6">
                {category.components.map((component, index) => (
                  <LayoutItem key={index}>
                    <Card className="h-full">
                      <CardHeader>
                        <div className="flex items-center justify-between">
                          <CardTitle className="text-lg">{component.name}</CardTitle>
                          <div className="flex gap-2">
                            <Button size="sm" variant="outline">
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button size="sm" variant="outline">
                              <Copy className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                        <CardDescription>{component.description}</CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="border rounded-lg p-4 bg-gradient-to-br from-background to-muted/30">
                          <div className="text-xs font-medium text-muted-foreground mb-2 flex items-center gap-1">
                            <Eye className="h-3 w-3" />
                            Preview
                          </div>
                          {component.preview}
                        </div>
                        
                        <div className="space-y-2">
                          <div className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                            <Code className="h-3 w-3" />
                            Usage
                          </div>
                          <pre className="text-xs bg-muted p-3 rounded-md overflow-x-auto">
                            <code>{component.code}</code>
                          </pre>
                        </div>
                      </CardContent>
                    </Card>
                  </LayoutItem>
                ))}
              </ResponsiveGrid>
            </ResponsiveTabsContent>
          ))}
        </ResponsiveTabs>
      </div>
    </ResponsiveContainer>
  );
}