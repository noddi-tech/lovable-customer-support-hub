import React from 'react';
import { ResponsiveContainer, ResponsiveTabs, ResponsiveTabsList, ResponsiveTabsTrigger, ResponsiveTabsContent, ResponsiveGrid, LayoutItem, ResponsiveFlex, AdaptiveSection } from '@/components/admin/design/components/layouts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Heading } from '@/components/ui/heading';
import { Code, Copy, Eye, Grid, Layout, Layers, Box, Type, Edit } from 'lucide-react';

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
    },
    {
      id: 'cards',
      name: 'Card Components',
      icon: Grid,
      components: [
        {
          name: 'Basic Card',
          description: 'Standard card with header, content, and footer sections',
          preview: (
            <Card className="w-full">
              <CardHeader>
                <CardTitle>Card Title</CardTitle>
                <CardDescription>Card description goes here</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm">Card content area</p>
              </CardContent>
            </Card>
          ),
          code: '<Card>\n  <CardHeader>\n    <CardTitle>Title</CardTitle>\n    <CardDescription>Description</CardDescription>\n  </CardHeader>\n  <CardContent>\n    <p>Content</p>\n  </CardContent>\n</Card>'
        },
        {
          name: 'Gradient Card',
          description: 'Card with gradient background and enhanced styling',
          preview: (
            <Card className="bg-gradient-to-br from-primary/10 via-accent/5 to-secondary/10 border-primary/20">
              <CardHeader>
                <CardTitle className="text-primary">Gradient Card</CardTitle>
                <CardDescription>Enhanced visual appeal</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm">Beautiful gradient styling</p>
              </CardContent>
            </Card>
          ),
          code: '<Card className="bg-gradient-to-br from-primary/10 via-accent/5 to-secondary/10 border-primary/20">\n  <CardHeader>\n    <CardTitle className="text-primary">Title</CardTitle>\n  </CardHeader>\n</Card>'
        }
      ]
    },
    {
      id: 'buttons',
      name: 'Button Components',
      icon: Box,
      components: [
        {
          name: 'Button Variants',
          description: 'All available button styles and sizes',
          preview: (
            <div className="flex flex-wrap gap-2">
              <Button variant="default" size="sm">Default</Button>
              <Button variant="secondary" size="sm">Secondary</Button>
              <Button variant="outline" size="sm">Outline</Button>
              <Button variant="ghost" size="sm">Ghost</Button>
              <Button variant="destructive" size="sm">Destructive</Button>
            </div>
          ),
          code: '<Button variant="default">Default</Button>\n<Button variant="secondary">Secondary</Button>\n<Button variant="outline">Outline</Button>'
        },
        {
          name: 'Icon Buttons',
          description: 'Buttons with icons for enhanced UX',
          preview: (
            <div className="flex gap-2">
              <Button size="sm" className="gap-2">
                <Eye className="h-4 w-4" />
                View
              </Button>
              <Button variant="outline" size="sm" className="gap-2">
                <Copy className="h-4 w-4" />
                Copy
              </Button>
              <Button variant="ghost" size="sm">
                <Code className="h-4 w-4" />
              </Button>
            </div>
          ),
          code: '<Button className="gap-2">\n  <Eye className="h-4 w-4" />\n  View\n</Button>'
        }
      ]
    },
    {
      id: 'typography',
      name: 'Typography Components',
      icon: Type,
      components: [
        {
          name: 'Headings',
          description: 'Semantic heading components with consistent styling',
          preview: (
            <div className="space-y-2">
              <Heading level={1} className="text-xl">Heading 1</Heading>
              <Heading level={2} className="text-lg">Heading 2</Heading>  
              <Heading level={3} className="text-base">Heading 3</Heading>
            </div>
          ),
          code: '<Heading level={1}>Main Title</Heading>\n<Heading level={2}>Section Title</Heading>\n<Heading level={3}>Subsection</Heading>'
        },
        {
          name: 'Text Variants',
          description: 'Different text styles and emphasis',
          preview: (
            <div className="space-y-1 text-sm">
              <p className="text-foreground">Default text</p>
              <p className="text-muted-foreground">Muted text</p>
              <p className="text-primary">Primary text</p>
              <p className="font-semibold">Semibold text</p>
              <p className="text-xs">Small text</p>
            </div>
          ),
          code: '<p className="text-foreground">Default</p>\n<p className="text-muted-foreground">Muted</p>\n<p className="text-primary">Primary</p>'
        }
      ]
    },
    {
      id: 'forms',
      name: 'Form Components',
      icon: Edit,
      components: [
        {
          name: 'Input Fields',
          description: 'Various input field types and states',
          preview: (
            <div className="space-y-2 w-full">
              <input type="text" placeholder="Default input" className="w-full px-3 py-2 border rounded-md text-sm" />
              <input type="email" placeholder="Email input" className="w-full px-3 py-2 border rounded-md text-sm" />
              <select className="w-full px-3 py-2 border rounded-md text-sm">
                <option>Select option</option>
              </select>
            </div>
          ),
          code: '<input type="text" placeholder="Placeholder" className="w-full px-3 py-2 border rounded-md" />'
        }
      ]
    }
  ];

  return (
    <div className="mx-auto w-full max-w-5xl px-4 sm:px-6 overflow-y-auto max-h-[calc(100vh-200px)]">
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <Box className="h-6 w-6 text-primary" />
          <Heading level={1} className="text-2xl">Design Components Library</Heading>
          <Badge variant="secondary">v1.0</Badge>
        </div>
        
        <p className="text-muted-foreground">
          Comprehensive collection of responsive layout and navigation components built on top of shadcn/ui and Tailwind CSS.
        </p>

        <ResponsiveTabs defaultValue="layouts" variant="underline" size="md" className="min-w-0">
          <ResponsiveTabsList className="w-full flex flex-wrap gap-1 min-w-0">
            {componentCategories.map((category) => (
              <ResponsiveTabsTrigger key={category.id} value={category.id} className="flex items-center gap-2 truncate min-w-0 shrink-0">
                <category.icon className="h-4 w-4 flex-shrink-0" />
                <span className="truncate">{category.name}</span>
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
    </div>
  );
}