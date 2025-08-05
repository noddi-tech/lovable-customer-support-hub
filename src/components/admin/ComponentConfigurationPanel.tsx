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
  const [activeTab, setActiveTab] = useState('buttons');

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
      <CardContent className="space-y-4">
        {children}
      </CardContent>
    </Card>
  );

  return (
    <div className="space-y-8">{/* Components Configuration Tabs */}
      <div className="border-b border-border">
        <nav className="flex space-x-8">
          {['buttons', 'cards', 'badges', 'alerts', 'avatars', 'icons', 'headings'].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`py-2 px-1 border-b-2 font-medium text-sm capitalize transition-colors ${
                activeTab === tab
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              {tab}
            </button>
          ))}
        </nav>
      </div>
      {/* Button Configuration */}
      {activeTab === 'buttons' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Button Components</CardTitle>
              <CardDescription>
                Configure default button variants, sizes, and colors using semantic design tokens.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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

          <ComponentPreview title="Button">
            <div className="space-y-6">
              <div className="space-y-3">
                <h4 className="text-sm font-medium">Button Variants</h4>
                <div className="flex flex-wrap gap-2">
                  <Button 
                    variant={designSystem.components.buttons.defaultVariant as any}
                    style={{ borderRadius: designSystem.components.buttons.borderRadius }}
                  >
                    {designSystem.components.buttons.defaultVariant}
                  </Button>
                  <Button variant="secondary">Secondary</Button>
                  <Button variant="destructive">Destructive</Button>
                  <Button variant="outline">Outline</Button>
                  <Button variant="ghost">Ghost</Button>
                  <Button variant="link">Link</Button>
                </div>
              </div>

              <Separator />

              <div className="space-y-3">
                <h4 className="text-sm font-medium">Button Sizes</h4>
                <div className="flex flex-wrap items-center gap-2">
                  <Button 
                    size="sm"
                    style={{ borderRadius: designSystem.components.buttons.borderRadius }}
                  >
                    Small
                  </Button>
                  <Button 
                    size={designSystem.components.buttons.defaultSize as any}
                    style={{ borderRadius: designSystem.components.buttons.borderRadius }}
                  >
                    {designSystem.components.buttons.defaultSize}
                  </Button>
                  <Button 
                    size="lg"
                    style={{ borderRadius: designSystem.components.buttons.borderRadius }}
                  >
                    Large
                  </Button>
                  <Button 
                    size="icon"
                    style={{ borderRadius: designSystem.components.buttons.borderRadius }}
                  >
                    <Heart className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              <Separator />

              <div className="space-y-3">
                <h4 className="text-sm font-medium">Buttons with Icons</h4>
                <div className="flex flex-wrap gap-2">
                  <Button style={{ borderRadius: designSystem.components.buttons.borderRadius }}>
                    <Send className="h-4 w-4 mr-2" />
                    Send
                  </Button>
                  <Button 
                    variant="outline"
                    style={{ borderRadius: designSystem.components.buttons.borderRadius }}
                  >
                    <Settings className="h-4 w-4 mr-2" />
                    Settings
                  </Button>
                  <Button 
                    variant="destructive"
                    style={{ borderRadius: designSystem.components.buttons.borderRadius }}
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete
                  </Button>
                </div>
              </div>
            </div>
          </ComponentPreview>
        </div>
      )}

      {/* Card Configuration */}
      {activeTab === 'cards' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Card Components</CardTitle>
              <CardDescription>
                Configure card variants, shadows, and colors using design system tokens.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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

          <ComponentPreview title="Card">
            <div className="space-y-4">
              <Card style={{ borderRadius: designSystem.components.cards.borderRadius }}>
                <CardHeader>
                  <CardTitle>Basic Card</CardTitle>
                  <CardDescription>A simple card with header and content</CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    This is the card content area where you can place any information.
                  </p>
                </CardContent>
              </Card>

              <Card 
                className={`bg-${designSystem.components.cards.backgroundColor} force-white-text`}
                style={{ borderRadius: designSystem.components.cards.borderRadius }}
              >
                <CardHeader>
                  <CardTitle>Themed Card</CardTitle>
                  <CardDescription className="card-description">A card with configured background</CardDescription>
                </CardHeader>
                <CardContent>
                  <p>This card uses the configured color scheme.</p>
                </CardContent>
              </Card>

              <Card 
                className="bg-gradient-surface border-primary/20"
                style={{ borderRadius: designSystem.components.cards.borderRadius }}
              >
                <CardHeader>
                  <CardTitle>Gradient Card</CardTitle>
                  <CardDescription>A card with gradient background</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center space-x-2">
                    <Avatar>
                      <AvatarFallback>JD</AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="text-sm font-medium">John Doe</p>
                      <p className="text-xs text-muted-foreground">john@example.com</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </ComponentPreview>
        </div>
      )}

      {/* Badge Configuration */}
      {activeTab === 'badges' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Badge Components</CardTitle>
              <CardDescription>
                Configure badge variants and colors using semantic tokens.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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

          <ComponentPreview title="Badge">
            <div className="space-y-6">
              <div className="space-y-3">
                <h4 className="text-sm font-medium">Badge Variants</h4>
                <div className="flex flex-wrap gap-2">
                  <Badge 
                    variant={designSystem.components.badges.defaultVariant as any}
                    style={{ borderRadius: designSystem.components.badges.borderRadius }}
                  >
                    {designSystem.components.badges.defaultVariant}
                  </Badge>
                  <Badge 
                    variant="secondary"
                    style={{ borderRadius: designSystem.components.badges.borderRadius }}
                  >
                    Secondary
                  </Badge>
                  <Badge 
                    variant="destructive"
                    style={{ borderRadius: designSystem.components.badges.borderRadius }}
                  >
                    Destructive
                  </Badge>
                  <Badge 
                    variant="outline"
                    style={{ borderRadius: designSystem.components.badges.borderRadius }}
                  >
                    Outline
                  </Badge>
                </div>
              </div>

              <Separator />

              <div className="space-y-3">
                <h4 className="text-sm font-medium">Status Badges</h4>
                <div className="flex flex-wrap gap-2">
                  <Badge 
                    className="bg-success text-success-foreground"
                    style={{ borderRadius: designSystem.components.badges.borderRadius }}
                  >
                    <Check className="h-3 w-3 mr-1" />
                    Success
                  </Badge>
                  <Badge 
                    className="bg-warning text-warning-foreground"
                    style={{ borderRadius: designSystem.components.badges.borderRadius }}
                  >
                    <AlertTriangle className="h-3 w-3 mr-1" />
                    Warning
                  </Badge>
                  <Badge 
                    variant="destructive"
                    style={{ borderRadius: designSystem.components.badges.borderRadius }}
                  >
                    <X className="h-3 w-3 mr-1" />
                    Error
                  </Badge>
                  <Badge 
                    variant="outline"
                    style={{ borderRadius: designSystem.components.badges.borderRadius }}
                  >
                    <Info className="h-3 w-3 mr-1" />
                    Info
                  </Badge>
                </div>
              </div>
            </div>
          </ComponentPreview>
        </div>
      )}

      {/* Alert Configuration */}
      {activeTab === 'alerts' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Alert Components</CardTitle>
              <CardDescription>
                Configure alert styles and behavior.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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

          <ComponentPreview title="Alert">
            <div className="space-y-4">
              <Alert 
                variant={designSystem.components.alerts.defaultVariant as any}
                style={{ borderRadius: designSystem.components.alerts.borderRadius }}
              >
                {designSystem.components.alerts.showIcon && <Info className="h-4 w-4" />}
                <AlertTitle>Information</AlertTitle>
                <AlertDescription>
                  This is an informational alert with important details.
                </AlertDescription>
              </Alert>

              <Alert 
                className="border-warning bg-warning text-black"
                style={{ 
                  backgroundColor: 'hsl(var(--warning) / 0.1)',
                  borderColor: 'hsl(var(--warning))',
                  color: 'hsl(0 0% 0%)',
                  borderRadius: designSystem.components.alerts.borderRadius
                }}
              >
                {designSystem.components.alerts.showIcon && <AlertTriangle className="h-4 w-4" style={{ color: 'hsl(var(--warning))' }} />}
                <AlertTitle style={{ color: 'hsl(0 0% 0%)' }}>Warning</AlertTitle>
                <AlertDescription style={{ color: 'hsl(0 0% 0%)' }}>
                  This is a warning alert. Please pay attention to this message.
                </AlertDescription>
              </Alert>

              <Alert 
                variant="destructive"
                style={{ borderRadius: designSystem.components.alerts.borderRadius }}
              >
                {designSystem.components.alerts.showIcon && <X className="h-4 w-4" />}
                <AlertTitle>Error</AlertTitle>
                <AlertDescription>
                  This is an error alert indicating something went wrong.
                </AlertDescription>
              </Alert>

              <Alert 
                className="border-success bg-success text-white"
                style={{ 
                  backgroundColor: 'hsl(var(--success))',
                  borderColor: 'hsl(var(--success))',
                  color: 'white',
                  borderRadius: designSystem.components.alerts.borderRadius
                }}
              >
                {designSystem.components.alerts.showIcon && <Check className="h-4 w-4" style={{ color: 'white' }} />}
                <AlertTitle style={{ color: 'white' }}>Success</AlertTitle>
                <AlertDescription style={{ color: 'white' }}>
                  This is a success alert. The operation completed successfully.
                </AlertDescription>
              </Alert>
            </div>
          </ComponentPreview>
        </div>
      )}

      {/* Avatar Configuration */}
      {activeTab === 'avatars' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Avatar Components</CardTitle>
              <CardDescription>
                Configure avatar sizes and styling.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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

          <ComponentPreview title="Avatar">
            <div className="space-y-6">
              <div className="space-y-3">
                <h4 className="text-sm font-medium">Avatar Sizes</h4>
                <div className="flex items-center gap-4">
                  <Avatar 
                    className="h-8 w-8"
                    style={{ 
                      borderRadius: designSystem.components.avatars.borderRadius,
                      borderWidth: designSystem.components.avatars.borderWidth
                    }}
                  >
                    <AvatarFallback>SM</AvatarFallback>
                  </Avatar>
                  <Avatar 
                    className="h-10 w-10"
                    style={{ 
                      borderRadius: designSystem.components.avatars.borderRadius,
                      borderWidth: designSystem.components.avatars.borderWidth
                    }}
                  >
                    <AvatarFallback>MD</AvatarFallback>
                  </Avatar>
                  <Avatar 
                    className="h-12 w-12"
                    style={{ 
                      borderRadius: designSystem.components.avatars.borderRadius,
                      borderWidth: designSystem.components.avatars.borderWidth
                    }}
                  >
                    <AvatarFallback>LG</AvatarFallback>
                  </Avatar>
                </div>
              </div>

              <Separator />

              <div className="space-y-3">
                <h4 className="text-sm font-medium">Avatar with User Info</h4>
                <div className="flex items-center space-x-3">
                  <Avatar 
                    style={{ 
                      borderRadius: designSystem.components.avatars.borderRadius,
                      borderWidth: designSystem.components.avatars.borderWidth
                    }}
                  >
                    <AvatarFallback>JD</AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="text-sm font-medium">John Doe</p>
                    <p className="text-xs text-muted-foreground">Product Manager</p>
                  </div>
                </div>
              </div>
            </div>
          </ComponentPreview>
        </div>
      )}

      {/* Icon Configuration */}
      {activeTab === 'icons' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Icon Components</CardTitle>
              <CardDescription>
                Configure icon defaults and styling.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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

          <ComponentPreview title="Icon">
            <div className="space-y-6">
              <div className="space-y-3">
                <h4 className="text-sm font-medium">Icon Sizes</h4>
                <div className="flex items-center gap-4">
                  <Heart 
                    className="h-4 w-4" 
                    strokeWidth={designSystem.components.icons.strokeWidth}
                  />
                  <Star 
                    className="h-5 w-5" 
                    strokeWidth={designSystem.components.icons.strokeWidth}
                  />
                  <Settings 
                    className="h-6 w-6" 
                    strokeWidth={designSystem.components.icons.strokeWidth}
                  />
                  <User 
                    className="h-8 w-8" 
                    strokeWidth={designSystem.components.icons.strokeWidth}
                  />
                </div>
              </div>

              <Separator />

              <div className="space-y-3">
                <h4 className="text-sm font-medium">Icon Variations</h4>
                <div className="flex items-center gap-4">
                  <Heart 
                    className="h-5 w-5 text-destructive" 
                    strokeWidth={designSystem.components.icons.strokeWidth}
                  />
                  <Star 
                    className="h-5 w-5 text-warning" 
                    strokeWidth={designSystem.components.icons.strokeWidth}
                  />
                  <Check 
                    className="h-5 w-5 text-success" 
                    strokeWidth={designSystem.components.icons.strokeWidth}
                  />
                  <Info 
                    className="h-5 w-5 text-primary" 
                    strokeWidth={designSystem.components.icons.strokeWidth}
                  />
                  <Settings 
                    className="h-5 w-5 text-muted-foreground" 
                    strokeWidth={designSystem.components.icons.strokeWidth}
                  />
                </div>
              </div>
            </div>
          </ComponentPreview>
        </div>
      )}

      {/* Headings Configuration */}
      {activeTab === 'headings' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Heading Components</CardTitle>
              <CardDescription>
                Configure heading styles, colors, and typography hierarchy.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Color Token</Label>
                  <Select
                    value={designSystem.components.headings.colorToken}
                    onValueChange={(value) => updateComponent('headings', 'colorToken', value)}
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
                  <Label>Style</Label>
                  <Select
                    value={designSystem.components.headings.style}
                    onValueChange={(value) => updateComponent('headings', 'style', value)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="solid">Solid Color</SelectItem>
                      <SelectItem value="gradient">Gradient</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Font Weight</Label>
                  <Select
                    value={designSystem.components.headings.fontWeight}
                    onValueChange={(value) => updateComponent('headings', 'fontWeight', value)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="normal">Normal</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="semibold">Semibold</SelectItem>
                      <SelectItem value="bold">Bold</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>H1 Size</Label>
                  <Input
                    value={designSystem.components.headings.h1Size}
                    onChange={(e) => updateComponent('headings', 'h1Size', e.target.value)}
                    placeholder="2.25rem"
                  />
                </div>

                <div className="space-y-2">
                  <Label>H2 Size</Label>
                  <Input
                    value={designSystem.components.headings.h2Size}
                    onChange={(e) => updateComponent('headings', 'h2Size', e.target.value)}
                    placeholder="1.875rem"
                  />
                </div>

                <div className="space-y-2">
                  <Label>H3 Size</Label>
                  <Input
                    value={designSystem.components.headings.h3Size}
                    onChange={(e) => updateComponent('headings', 'h3Size', e.target.value)}
                    placeholder="1.5rem"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          <ComponentPreview title="Headings">
            <div className="space-y-6">
              <div className="space-y-4">
                <h1 
                  className={`font-${designSystem.components.headings.fontWeight} ${
                    designSystem.components.headings.style === 'gradient' 
                      ? 'bg-gradient-primary bg-clip-text text-transparent' 
                      : `text-${designSystem.components.headings.colorToken}`
                  }`}
                  style={{ fontSize: designSystem.components.headings.h1Size }}
                >
                  H1 Heading Example
                </h1>
                
                <h2 
                  className={`font-${designSystem.components.headings.fontWeight} ${
                    designSystem.components.headings.style === 'gradient' 
                      ? 'bg-gradient-primary bg-clip-text text-transparent' 
                      : `text-${designSystem.components.headings.colorToken}`
                  }`}
                  style={{ fontSize: designSystem.components.headings.h2Size }}
                >
                  H2 Heading Example
                </h2>
                
                <h3 
                  className={`font-${designSystem.components.headings.fontWeight} ${
                    designSystem.components.headings.style === 'gradient' 
                      ? 'bg-gradient-primary bg-clip-text text-transparent' 
                      : `text-${designSystem.components.headings.colorToken}`
                  }`}
                  style={{ fontSize: designSystem.components.headings.h3Size }}
                >
                  H3 Heading Example
                </h3>
              </div>

              <Separator />

              <div className="space-y-3">
                <h4 className="text-sm font-medium">Different Contexts</h4>
                <div className="space-y-3">
                  <div className="p-4 bg-card rounded-lg border">
                    <h2 
                      className={`font-${designSystem.components.headings.fontWeight} ${
                        designSystem.components.headings.style === 'gradient' 
                          ? 'bg-gradient-primary bg-clip-text text-transparent' 
                          : `text-${designSystem.components.headings.colorToken}`
                      }`}
                      style={{ fontSize: designSystem.components.headings.h2Size }}
                    >
                      Card Header
                    </h2>
                    <p className="text-muted-foreground mt-1">This is how headings look in cards</p>
                  </div>
                  
                  <div className="p-4 bg-muted rounded-lg">
                    <h3 
                      className={`font-${designSystem.components.headings.fontWeight} ${
                        designSystem.components.headings.style === 'gradient' 
                          ? 'bg-gradient-primary bg-clip-text text-transparent' 
                          : `text-${designSystem.components.headings.colorToken}`
                      }`}
                      style={{ fontSize: designSystem.components.headings.h3Size }}
                    >
                      Section Title
                    </h3>
                    <p className="text-muted-foreground mt-1">This is how headings look in different backgrounds</p>
                  </div>
                </div>
              </div>
            </div>
          </ComponentPreview>
        </div>
      )}
    </div>
  );
};