import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { useDesignSystem } from '@/contexts/DesignSystemContext';
import { ResponsiveGrid, ResponsiveTabs, AdaptiveSection, ResponsiveFlex } from '@/components/admin/design/components/layouts';
import { 
  Check, 
  AlertTriangle, 
  Info, 
  X, 
  Settings, 
  User, 
  Heart,
  Star,
  Send,
  Trash2
} from 'lucide-react';

export const ComponentConfigurationPanel: React.FC = () => {
  const { designSystem, updateDesignSystem } = useDesignSystem();

  // Helper function to update nested component properties
  const updateComponent = (
    componentType: keyof typeof designSystem.components,
    property: string,
    value: any
  ) => {
    updateDesignSystem({
      components: {
        ...designSystem.components,
        [componentType]: {
          ...designSystem.components[componentType],
          [property]: value,
        },
      },
    });
  };

  // Get available color keys for dropdowns
  const colorKeys = Object.keys(designSystem.colors) as Array<keyof typeof designSystem.colors>;

  // Component Preview Section
  const ComponentPreview = ({ title, children }: { title: string; children: React.ReactNode }) => (
    <Card className="bg-muted/20">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium">{title} Preview</CardTitle>
        <CardDescription className="text-xs">
          See how your changes affect the components in real-time
        </CardDescription>
      </CardHeader>
      <CardContent>
        <AdaptiveSection spacing="4">
          {children}
        </AdaptiveSection>
      </CardContent>
    </Card>
  );

  const componentTabs = [
    {
      value: 'buttons',
      label: 'Buttons',
      content: (
        <ResponsiveGrid cols={{ sm: '1', lg: '2' }} gap="6">
          <Card>
            <CardHeader>
              <CardTitle>Button Components</CardTitle>
              <CardDescription>
                Configure default button variants, sizes, and colors using semantic design tokens.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <AdaptiveSection spacing="4">
                <ResponsiveGrid cols={{ sm: '1', md: '2' }} gap="4">
                  <AdaptiveSection spacing="2">
                    <Label>Default Variant</Label>
                    <Select
                      value={designSystem.components.buttons.defaultVariant}
                      onValueChange={(value) => updateComponent('buttons', 'defaultVariant', value)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="default">Default</SelectItem>
                        <SelectItem value="destructive">Destructive</SelectItem>
                        <SelectItem value="outline">Outline</SelectItem>
                        <SelectItem value="secondary">Secondary</SelectItem>
                        <SelectItem value="ghost">Ghost</SelectItem>
                        <SelectItem value="link">Link</SelectItem>
                      </SelectContent>
                    </Select>
                  </AdaptiveSection>

                  <AdaptiveSection spacing="2">
                    <Label>Default Size</Label>
                    <Select
                      value={designSystem.components.buttons.defaultSize}
                      onValueChange={(value) => updateComponent('buttons', 'defaultSize', value)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="default">Default</SelectItem>
                        <SelectItem value="sm">Small</SelectItem>
                        <SelectItem value="lg">Large</SelectItem>
                        <SelectItem value="icon">Icon</SelectItem>
                      </SelectContent>
                    </Select>
                  </AdaptiveSection>
                </ResponsiveGrid>
              </AdaptiveSection>
            </CardContent>
          </Card>

          <ComponentPreview title="Button">
            <AdaptiveSection spacing="6">
              <AdaptiveSection spacing="3">
                <h4 className="text-sm font-medium">Button Variants</h4>
                <ResponsiveFlex gap="2" wrap>
                  <Button variant="default">Default</Button>
                  <Button variant="secondary">Secondary</Button>
                  <Button variant="destructive">Destructive</Button>
                  <Button variant="outline">Outline</Button>
                  <Button variant="ghost">Ghost</Button>
                  <Button variant="link">Link</Button>
                </ResponsiveFlex>
              </AdaptiveSection>
            </AdaptiveSection>
          </ComponentPreview>
        </ResponsiveGrid>
      )
    }
  ];

  return (
    <AdaptiveSection spacing="8">
      <ResponsiveTabs
        items={componentTabs}
        defaultValue="buttons"
        orientation="responsive"
        breakpoint="lg"
        variant="underline"
      />
    </AdaptiveSection>
  );
};