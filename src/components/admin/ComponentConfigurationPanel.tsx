import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { useDesignSystem } from '@/contexts/DesignSystemContext';

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

  return (
    <div className="space-y-6">
      {/* Button Configuration */}
      <Card>
        <CardHeader>
          <CardTitle>Button Components</CardTitle>
          <CardDescription>
            Configure default button variants, sizes, and colors using semantic design tokens.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="space-y-2">
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
            </div>

            <div className="space-y-2">
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
            </div>

            <div className="space-y-2">
              <Label>Border Radius</Label>
              <Input
                value={designSystem.components.buttons.borderRadius}
                onChange={(e) => updateComponent('buttons', 'borderRadius', e.target.value)}
                placeholder="0.5rem"
              />
            </div>

            <div className="space-y-2">
              <Label>Primary Color Token</Label>
              <Select
                value={designSystem.components.buttons.primaryColor}
                onValueChange={(value) => updateComponent('buttons', 'primaryColor', value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {colorKeys.map((colorKey) => (
                    <SelectItem key={colorKey} value={colorKey}>
                      {colorKey}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Secondary Color Token</Label>
              <Select
                value={designSystem.components.buttons.secondaryColor}
                onValueChange={(value) => updateComponent('buttons', 'secondaryColor', value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {colorKeys.map((colorKey) => (
                    <SelectItem key={colorKey} value={colorKey}>
                      {colorKey}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Card Configuration */}
      <Card>
        <CardHeader>
          <CardTitle>Card Components</CardTitle>
          <CardDescription>
            Configure card variants, shadows, and colors using design system tokens.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Default Variant</Label>
              <Select
                value={designSystem.components.cards.defaultVariant}
                onValueChange={(value) => updateComponent('cards', 'defaultVariant', value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="default">Default</SelectItem>
                  <SelectItem value="outline">Outline</SelectItem>
                  <SelectItem value="elevated">Elevated</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Border Radius</Label>
              <Input
                value={designSystem.components.cards.borderRadius}
                onChange={(e) => updateComponent('cards', 'borderRadius', e.target.value)}
                placeholder="0.75rem"
              />
            </div>

            <div className="space-y-2">
              <Label>Shadow</Label>
              <Select
                value={designSystem.components.cards.shadow}
                onValueChange={(value) => updateComponent('cards', 'shadow', value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  <SelectItem value="sm">Small</SelectItem>
                  <SelectItem value="md">Medium</SelectItem>
                  <SelectItem value="lg">Large</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Background Color Token</Label>
              <Select
                value={designSystem.components.cards.backgroundColor}
                onValueChange={(value) => updateComponent('cards', 'backgroundColor', value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {colorKeys.map((colorKey) => (
                    <SelectItem key={colorKey} value={colorKey}>
                      {colorKey}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Border Color Token</Label>
              <Select
                value={designSystem.components.cards.borderColor}
                onValueChange={(value) => updateComponent('cards', 'borderColor', value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {colorKeys.map((colorKey) => (
                    <SelectItem key={colorKey} value={colorKey}>
                      {colorKey}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Badge Configuration */}
      <Card>
        <CardHeader>
          <CardTitle>Badge Components</CardTitle>
          <CardDescription>
            Configure badge variants and colors using semantic tokens.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Default Variant</Label>
              <Select
                value={designSystem.components.badges.defaultVariant}
                onValueChange={(value) => updateComponent('badges', 'defaultVariant', value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="default">Default</SelectItem>
                  <SelectItem value="secondary">Secondary</SelectItem>
                  <SelectItem value="destructive">Destructive</SelectItem>
                  <SelectItem value="outline">Outline</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Primary Color Token</Label>
              <Select
                value={designSystem.components.badges.primaryColor}
                onValueChange={(value) => updateComponent('badges', 'primaryColor', value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {colorKeys.map((colorKey) => (
                    <SelectItem key={colorKey} value={colorKey}>
                      {colorKey}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Secondary Color Token</Label>
              <Select
                value={designSystem.components.badges.secondaryColor}
                onValueChange={(value) => updateComponent('badges', 'secondaryColor', value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {colorKeys.map((colorKey) => (
                    <SelectItem key={colorKey} value={colorKey}>
                      {colorKey}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Border Radius</Label>
              <Input
                value={designSystem.components.badges.borderRadius}
                onChange={(e) => updateComponent('badges', 'borderRadius', e.target.value)}
                placeholder="0.375rem"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Alert Configuration */}
      <Card>
        <CardHeader>
          <CardTitle>Alert Components</CardTitle>
          <CardDescription>
            Configure alert styles and behavior.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Default Variant</Label>
              <Select
                value={designSystem.components.alerts.defaultVariant}
                onValueChange={(value) => updateComponent('alerts', 'defaultVariant', value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="default">Default</SelectItem>
                  <SelectItem value="destructive">Destructive</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Border Radius</Label>
              <Input
                value={designSystem.components.alerts.borderRadius}
                onChange={(e) => updateComponent('alerts', 'borderRadius', e.target.value)}
                placeholder="0.5rem"
              />
            </div>

            <div className="space-y-2 flex items-center justify-between">
              <Label>Show Icons</Label>
              <Switch
                checked={designSystem.components.alerts.showIcon}
                onCheckedChange={(checked) => updateComponent('alerts', 'showIcon', checked)}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Avatar Configuration */}
      <Card>
        <CardHeader>
          <CardTitle>Avatar Components</CardTitle>
          <CardDescription>
            Configure avatar sizes and styling.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Default Size</Label>
              <Select
                value={designSystem.components.avatars.defaultSize}
                onValueChange={(value) => updateComponent('avatars', 'defaultSize', value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="sm">Small</SelectItem>
                  <SelectItem value="md">Medium</SelectItem>
                  <SelectItem value="lg">Large</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Border Radius</Label>
              <Input
                value={designSystem.components.avatars.borderRadius}
                onChange={(e) => updateComponent('avatars', 'borderRadius', e.target.value)}
                placeholder="50%"
              />
            </div>

            <div className="space-y-2">
              <Label>Border Width</Label>
              <Input
                value={designSystem.components.avatars.borderWidth}
                onChange={(e) => updateComponent('avatars', 'borderWidth', e.target.value)}
                placeholder="2px"
              />
            </div>

            <div className="space-y-2">
              <Label>Border Color Token</Label>
              <Select
                value={designSystem.components.avatars.borderColor}
                onValueChange={(value) => updateComponent('avatars', 'borderColor', value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {colorKeys.map((colorKey) => (
                    <SelectItem key={colorKey} value={colorKey}>
                      {colorKey}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Icon Configuration */}
      <Card>
        <CardHeader>
          <CardTitle>Icon Components</CardTitle>
          <CardDescription>
            Configure icon defaults and styling.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Default Size</Label>
              <Select
                value={designSystem.components.icons.defaultSize}
                onValueChange={(value) => updateComponent('icons', 'defaultSize', value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="sm">Small</SelectItem>
                  <SelectItem value="md">Medium</SelectItem>
                  <SelectItem value="lg">Large</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Stroke Width</Label>
              <div className="space-y-2">
                <Slider
                  value={[designSystem.components.icons.strokeWidth]}
                  onValueChange={(value) => updateComponent('icons', 'strokeWidth', value[0])}
                  max={4}
                  min={1}
                  step={0.5}
                  className="w-full"
                />
                <div className="text-xs text-muted-foreground text-center">
                  {designSystem.components.icons.strokeWidth}px
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Primary Color Token</Label>
              <Select
                value={designSystem.components.icons.primaryColor}
                onValueChange={(value) => updateComponent('icons', 'primaryColor', value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {colorKeys.map((colorKey) => (
                    <SelectItem key={colorKey} value={colorKey}>
                      {colorKey}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};