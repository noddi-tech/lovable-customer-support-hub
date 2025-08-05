import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Save, Palette, Eye, Download, Upload, Settings, Layout, Layers } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useState } from 'react';
import { useToast } from '@/hooks/use-toast';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useDesignSystem } from '@/contexts/DesignSystemContext';

export const DesignLibrary = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { designSystem, updateDesignSystem, saveDesignSystem, isLoading } = useDesignSystem();

  // Save to database
  const saveMutation = useMutation({
    mutationFn: saveDesignSystem,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['organization-design-system'] });
      toast({
        title: "Design system saved",
        description: "Your design system has been saved successfully.",
      });
    },
    onError: (error) => {
      console.error('Save error:', error);
      toast({
        title: "Error saving design system",
        description: "There was an error saving your design system. Please try again.",
        variant: "destructive",
      });
    },
  });

  const updateColor = (colorKey: keyof typeof designSystem.colors, hslValue: string) => {
    updateDesignSystem({
      colors: {
        ...designSystem.colors,
        [colorKey]: hslValue
      }
    });
  };

  const updateGradient = (gradientKey: keyof typeof designSystem.gradients, value: string) => {
    updateDesignSystem({
      gradients: {
        ...designSystem.gradients,
        [gradientKey]: value
      }
    });
  };

  const updateTypography = (typographyKey: keyof typeof designSystem.typography, value: any) => {
    updateDesignSystem({
      typography: {
        ...designSystem.typography,
        [typographyKey]: value
      }
    });
  };

  const updateSpacing = (spacingKey: keyof typeof designSystem.spacing, value: string | number) => {
    updateDesignSystem({
      spacing: {
        ...designSystem.spacing,
        [spacingKey]: value
      }
    });
  };

  const updateComponents = (componentType: keyof typeof designSystem.components, componentKey: string, value: any) => {
    updateDesignSystem({
      components: {
        ...designSystem.components,
        [componentType]: {
          ...designSystem.components[componentType],
          [componentKey]: value
        }
      }
    });
  };

  const saveToDatabase = () => {
    saveMutation.mutate();
  };

  const colorInputs = [
    { key: 'primary' as const, label: 'Primary', description: 'Main brand color' },
    { key: 'primaryForeground' as const, label: 'Primary Foreground', description: 'Text on primary color' },
    { key: 'secondary' as const, label: 'Secondary', description: 'Secondary actions' },
    { key: 'secondaryForeground' as const, label: 'Secondary Foreground', description: 'Text on secondary color' },
    { key: 'accent' as const, label: 'Accent', description: 'Accent highlights' },
    { key: 'accentForeground' as const, label: 'Accent Foreground', description: 'Text on accent color' },
    { key: 'background' as const, label: 'Background', description: 'Page background' },
    { key: 'foreground' as const, label: 'Foreground', description: 'Main text color' },
    { key: 'muted' as const, label: 'Muted', description: 'Subtle backgrounds' },
    { key: 'mutedForeground' as const, label: 'Muted Foreground', description: 'Subtle text' },
    { key: 'card' as const, label: 'Card', description: 'Card backgrounds' },
    { key: 'cardForeground' as const, label: 'Card Foreground', description: 'Text on cards' },
    { key: 'border' as const, label: 'Border', description: 'Border color' },
    { key: 'success' as const, label: 'Success', description: 'Success states' },
    { key: 'successForeground' as const, label: 'Success Foreground', description: 'Text on success color' },
    { key: 'warning' as const, label: 'Warning', description: 'Warning states' },
    { key: 'warningForeground' as const, label: 'Warning Foreground', description: 'Text on warning color' },
    { key: 'destructive' as const, label: 'Destructive', description: 'Error states' },
    { key: 'destructiveForeground' as const, label: 'Destructive Foreground', description: 'Text on error color' },
  ];

  const HSLColorPicker = ({ label, value, onChange, description }: {
    label: string;
    value: string;
    onChange: (value: string) => void;
    description: string;
  }) => (
    <div className="space-y-2">
      <Label>{label}</Label>
      <div className="flex gap-2 items-center">
        <Input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="217 91% 60%"
          className="flex-1"
        />
        <div 
          className="w-10 h-10 rounded border-2 border-border"
          style={{ backgroundColor: `hsl(${value})` }}
        />
      </div>
      <p className="text-xs text-muted-foreground">{description}</p>
    </div>
  );

  const GradientEditor = ({ label, value, onChange, description }: {
    label: string;
    value: string;
    onChange: (value: string) => void;
    description: string;
  }) => (
    <div className="space-y-2">
      <Label>{label}</Label>
      <Input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="linear-gradient(135deg, hsl(217 91% 60%), hsl(217 91% 55%))"
      />
      <div 
        className="h-10 rounded border-2 border-border"
        style={{ background: value }}
      />
      <p className="text-xs text-muted-foreground">{description}</p>
    </div>
  );

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-primary">Design Library</h3>
        <p className="text-muted-foreground">
          Manage your organization's design system and component library
        </p>
      </div>

      <Tabs defaultValue="colors" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="colors">Colors</TabsTrigger>
          <TabsTrigger value="typography">Typography</TabsTrigger>
          <TabsTrigger value="spacing">Spacing</TabsTrigger>
          <TabsTrigger value="components">Components</TabsTrigger>
        </TabsList>

        <TabsContent value="colors">
          <div className="grid gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Palette className="w-5 h-5" />
                  Color System
                </CardTitle>
                <CardDescription>
                  Define your organization's color palette using HSL values for consistent theming.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {colorInputs.map((input) => (
                    <HSLColorPicker
                      key={input.key}
                      label={input.label}
                      value={designSystem.colors[input.key]}
                      onChange={(value) => updateColor(input.key, value)}
                      description={input.description}
                    />
                  ))}
                </div>

                <Separator />

                <div className="space-y-4">
                  <h4 className="text-lg font-medium">Gradients</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <GradientEditor
                      label="Primary Gradient"
                      value={designSystem.gradients.primary}
                      onChange={(value) => updateGradient('primary', value)}
                      description="Main gradient for primary elements"
                    />
                    <GradientEditor
                      label="Surface Gradient"
                      value={designSystem.gradients.surface}
                      onChange={(value) => updateGradient('surface', value)}
                      description="Subtle gradient for surface elements"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="typography">
          <Card>
            <CardHeader>
              <CardTitle>Typography Scale</CardTitle>
              <CardDescription>
                Configure font family, sizes, weights, and line heights.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Font Family</Label>
                  <Input
                    value={designSystem.typography.fontFamily}
                    onChange={(e) => updateTypography('fontFamily', e.target.value)}
                    placeholder="Inter, system-ui, sans-serif"
                  />
                </div>
              </div>

              <Separator />

              <div className="space-y-4">
                <h4 className="text-lg font-medium">Font Sizes</h4>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {Object.entries(designSystem.typography.fontSize).map(([key, value]) => (
                    <div key={key} className="space-y-2">
                      <Label>{key}</Label>
                      <Input
                        value={value}
                        onChange={(e) => updateTypography('fontSize', {
                          ...designSystem.typography.fontSize,
                          [key]: e.target.value
                        })}
                        placeholder="1rem"
                      />
                    </div>
                  ))}
                </div>
              </div>

              <Separator />

              <div className="space-y-4">
                <h4 className="text-lg font-medium">Font Weights</h4>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {Object.entries(designSystem.typography.fontWeight).map(([key, value]) => (
                    <div key={key} className="space-y-2">
                      <Label>{key}</Label>
                      <Input
                        value={value}
                        onChange={(e) => updateTypography('fontWeight', {
                          ...designSystem.typography.fontWeight,
                          [key]: e.target.value
                        })}
                        placeholder="400"
                      />
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="spacing">
          <Card>
            <CardHeader>
              <CardTitle>Spacing System</CardTitle>
              <CardDescription>
                Define consistent spacing values throughout your application.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {Object.entries(designSystem.spacing).map(([key, value]) => (
                  key !== 'baseUnit' && (
                    <div key={key} className="space-y-2">
                      <Label>{key}</Label>
                      <Input
                        value={value}
                        onChange={(e) => updateSpacing(key as keyof typeof designSystem.spacing, e.target.value)}
                        placeholder="1rem"
                      />
                    </div>
                  )
                ))}
                <div className="space-y-2">
                  <Label>Base Unit</Label>
                  <Input
                    type="number"
                    value={designSystem.spacing.baseUnit.toString()}
                    onChange={(e) => updateSpacing('baseUnit', parseInt(e.target.value) || 4)}
                    placeholder="4"
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="components">
          <div className="grid gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Button Components</CardTitle>
                <CardDescription>
                  Configure button styles and behaviors.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="space-y-2">
                    <Label>Border Radius</Label>
                    <Input
                      value={designSystem.components.buttons.borderRadius}
                      onChange={(e) => updateComponents('buttons', 'borderRadius', e.target.value)}
                      placeholder="0.5rem"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Padding</Label>
                    <Input
                      value={designSystem.components.buttons.padding}
                      onChange={(e) => updateComponents('buttons', 'padding', e.target.value)}
                      placeholder="0.5rem 1rem"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Primary Style</Label>
                    <Select
                      value={designSystem.components.buttons.primaryStyle}
                      onValueChange={(value) => updateComponents('buttons', 'primaryStyle', value)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="solid">Solid</SelectItem>
                        <SelectItem value="outline">Outline</SelectItem>
                        <SelectItem value="ghost">Ghost</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Secondary Style</Label>
                    <Select
                      value={designSystem.components.buttons.secondaryStyle}
                      onValueChange={(value) => updateComponents('buttons', 'secondaryStyle', value)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="solid">Solid</SelectItem>
                        <SelectItem value="outline">Outline</SelectItem>
                        <SelectItem value="ghost">Ghost</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Card Components</CardTitle>
                <CardDescription>
                  Configure card styles and layout.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="space-y-2">
                    <Label>Background</Label>
                    <Input
                      value={designSystem.components.cards.background}
                      onChange={(e) => updateComponents('cards', 'background', e.target.value)}
                      placeholder="hsl(0 0% 100%)"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Border Radius</Label>
                    <Input
                      value={designSystem.components.cards.borderRadius}
                      onChange={(e) => updateComponents('cards', 'borderRadius', e.target.value)}
                      placeholder="0.75rem"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Shadow</Label>
                    <Input
                      value={designSystem.components.cards.shadow}
                      onChange={(e) => updateComponents('cards', 'shadow', e.target.value)}
                      placeholder="0 4px 6px -1px rgb(0 0 0 / 0.1)"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Padding</Label>
                    <Input
                      value={designSystem.components.cards.padding}
                      onChange={(e) => updateComponents('cards', 'padding', e.target.value)}
                      placeholder="1.5rem"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Icon Components</CardTitle>
                <CardDescription>
                  Configure icon size and color.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Size</Label>
                    <Select
                      value={designSystem.components.icons.size}
                      onValueChange={(value) => updateComponents('icons', 'size', value as 'sm' | 'md' | 'lg')}
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
                    <Label>Color</Label>
                    <Input
                      value={designSystem.components.icons.color}
                      onChange={(e) => updateComponents('icons', 'color', e.target.value)}
                      placeholder="hsl(220 9% 46%)"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      <div className="flex justify-end">
        <Button
          onClick={saveToDatabase}
          disabled={saveMutation.isPending || isLoading}
          className="w-full md:w-auto"
        >
          <Save className="w-4 h-4 mr-2" />
          {saveMutation.isPending ? 'Saving...' : 'Save to Database'}
        </Button>
      </div>
    </div>
  );
};

export default DesignLibrary;