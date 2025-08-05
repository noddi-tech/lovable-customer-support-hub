import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Save, Palette, Eye, Download, Upload, Settings, Layout, Layers } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast as showToast } from 'sonner';
import { useState, useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

interface DesignSystemConfig {
  colors: {
    primary: string;
    secondary: string;
    accent: string;
    destructive: string;
    success: string;
    warning: string;
    background: string;
    foreground: string;
    muted: string;
    card: string;
  };
  typography: {
    primaryFont: string;
    secondaryFont: string;
    headingWeight: string;
    bodyWeight: string;
  };
  spacing: {
    baseUnit: string;
    sectionSpacing: string;
    elementSpacing: string;
    containerPadding: string;
  };
  borderRadius: {
    base: string;
  };
  components: {
    toast: {
      position: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right' | 'top-center' | 'bottom-center';
      style: 'default' | 'minimal' | 'rounded' | 'sharp';
      borderRadius: string;
      padding: string;
    };
    card: {
      shadow: 'none' | 'sm' | 'md' | 'lg' | 'xl';
      border: 'none' | 'subtle' | 'strong';
      borderRadius: string;
      padding: string;
    };
    buttons: {
      style: 'default' | 'rounded' | 'sharp' | 'pill';
      size: 'sm' | 'md' | 'lg';
      spacing: string;
      borderRadius: string;
      padding: string;
    };
    icons: {
      style: 'outline' | 'filled' | 'duotone';
      size: 'sm' | 'md' | 'lg';
    };
  };
}

interface OrganizationWithDesignSystem {
  id: string;
  name: string;
  primary_color: string;
  metadata?: {
    design_system?: DesignSystemConfig;
  };
}

export const DesignLibrary = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [designSystem, setDesignSystem] = useState<DesignSystemConfig>({
    colors: {
      primary: '#3B82F6',
      secondary: '#64748B',
      accent: '#8B5CF6',
      destructive: '#EF4444',
      success: '#10B981',
      warning: '#F59E0B',
      background: '#FFFFFF',
      foreground: '#0F172A',
      muted: '#F1F5F9',
      card: '#FFFFFF',
    },
    typography: {
      primaryFont: 'Inter',
      secondaryFont: 'Inter',
      headingWeight: '600',
      bodyWeight: '400',
    },
    spacing: {
      baseUnit: '4px',
      sectionSpacing: '32px',
      elementSpacing: '16px',
      containerPadding: '40px',
    },
    borderRadius: {
      base: '8px',
    },
    components: {
      toast: {
        position: 'bottom-right',
        style: 'default',
        borderRadius: '8px',
        padding: '16px',
      },
      card: {
        shadow: 'sm',
        border: 'subtle',
        borderRadius: '12px',
        padding: '24px',
      },
      buttons: {
        style: 'default',
        size: 'md',
        spacing: '8px',
        borderRadius: '6px',
        padding: '12px 16px',
      },
      icons: {
        style: 'outline',
        size: 'md',
      },
    },
  });

  // Fetch current organization data
  const { data: organization, isLoading } = useQuery<OrganizationWithDesignSystem | null>({
    queryKey: ['organization'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('organizations')
        .select('*')
        .maybeSingle();
      
      if (error) throw error;
      return data as OrganizationWithDesignSystem | null;
    },
  });

  // Load design system data into form fields
  useEffect(() => {
    if (organization) {
      const metadata = organization.metadata || {};
      const savedDesignSystem = metadata.design_system;
      
      if (savedDesignSystem) {
        setDesignSystem(savedDesignSystem);
      } else {
        // If no design system saved, use primary_color as fallback
        setDesignSystem(prev => ({
          ...prev,
          colors: {
            ...prev.colors,
            primary: organization.primary_color || '#3B82F6'
          }
        }));
      }
    }
  }, [organization]);

  // Apply design system to CSS variables
  const applyDesignSystem = (config: DesignSystemConfig) => {
    const root = document.documentElement;
    
    // Convert hex to HSL for CSS variables
    const hexToHsl = (hex: string) => {
      const r = parseInt(hex.slice(1, 3), 16) / 255;
      const g = parseInt(hex.slice(3, 5), 16) / 255;
      const b = parseInt(hex.slice(5, 7), 16) / 255;

      const max = Math.max(r, g, b);
      const min = Math.min(r, g, b);
      let h = 0, s = 0, l = (max + min) / 2;

      if (max !== min) {
        const d = max - min;
        s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
        switch (max) {
          case r: h = (g - b) / d + (g < b ? 6 : 0); break;
          case g: h = (b - r) / d + 2; break;
          case b: h = (r - g) / d + 4; break;
        }
        h /= 6;
      }

      return `${Math.round(h * 360)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`;
    };

    // Apply color variables
    root.style.setProperty('--primary', hexToHsl(config.colors.primary));
    root.style.setProperty('--secondary', hexToHsl(config.colors.secondary));
    root.style.setProperty('--accent', hexToHsl(config.colors.accent));
    root.style.setProperty('--destructive', hexToHsl(config.colors.destructive));
    
    // Apply other design tokens
    root.style.setProperty('--radius', config.borderRadius.base);
  };

  // Mutation for updating design system
  const updateDesignSystemMutation = useMutation({
    mutationFn: async (config: DesignSystemConfig) => {
      const currentMetadata = organization?.metadata || {};
      const { error } = await supabase
        .from('organizations')
        .update({
          primary_color: config.colors.primary, // Keep for backward compatibility
          metadata: {
            ...currentMetadata,
            design_system: config,
          }
        } as any)
        .eq('id', organization?.id);
      
      if (error) throw error;
      return config;
    },
    onSuccess: (config) => {
      queryClient.invalidateQueries({ queryKey: ['organization'] });
      applyDesignSystem(config);
      toast({
        title: "Design system updated",
        description: "Your design system has been applied successfully.",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to save design system. Please try again.",
        variant: "destructive",
      });
      console.error('Error updating design system:', error);
    },
  });

  const handleSaveDesignSystem = () => {
    updateDesignSystemMutation.mutate(designSystem);
  };

  const handleColorChange = (colorKey: keyof DesignSystemConfig['colors'], value: string) => {
    setDesignSystem(prev => ({
      ...prev,
      colors: {
        ...prev.colors,
        [colorKey]: value
      }
    }));
  };

  const ColorPicker = ({ label, colorKey, value }: { 
    label: string; 
    colorKey: keyof DesignSystemConfig['colors']; 
    value: string; 
  }) => (
    <div className="space-y-2">
      <Label htmlFor={colorKey}>{label}</Label>
      <div className="flex gap-2">
        <Input 
          id={colorKey}
          value={value}
          onChange={(e) => handleColorChange(colorKey, e.target.value)}
          placeholder="#000000"
        />
        <div 
          className="w-10 h-10 rounded border cursor-pointer" 
          style={{ backgroundColor: value }}
          onClick={() => {
            const input = document.createElement('input');
            input.type = 'color';
            input.value = value;
            input.onchange = (e) => handleColorChange(colorKey, (e.target as HTMLInputElement).value);
            input.click();
          }}
        />
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold">Design Library</h3>
        <p className="text-muted-foreground">
          Manage your organization's design system and component library
        </p>
      </div>

      <Tabs defaultValue="colors" className="space-y-6">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="colors">Colors</TabsTrigger>
          <TabsTrigger value="typography">Typography</TabsTrigger>
          <TabsTrigger value="spacing">Spacing</TabsTrigger>
          <TabsTrigger value="components">Components</TabsTrigger>
          <TabsTrigger value="interactions">Interactions</TabsTrigger>
        </TabsList>

        <TabsContent value="colors">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Palette className="w-5 h-5" />
                  Color Palette
                </CardTitle>
                <CardDescription>
                  Define your organization's color system
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <ColorPicker 
                    label="Primary" 
                    colorKey="primary" 
                    value={designSystem.colors.primary} 
                  />
                  <ColorPicker 
                    label="Secondary" 
                    colorKey="secondary" 
                    value={designSystem.colors.secondary} 
                  />
                  <ColorPicker 
                    label="Accent" 
                    colorKey="accent" 
                    value={designSystem.colors.accent} 
                  />
                  <ColorPicker 
                    label="Destructive" 
                    colorKey="destructive" 
                    value={designSystem.colors.destructive} 
                  />
                  <ColorPicker 
                    label="Success" 
                    colorKey="success" 
                    value={designSystem.colors.success} 
                  />
                  <ColorPicker 
                    label="Warning" 
                    colorKey="warning" 
                    value={designSystem.colors.warning} 
                  />
                  <ColorPicker 
                    label="Background" 
                    colorKey="background" 
                    value={designSystem.colors.background} 
                  />
                  <ColorPicker 
                    label="Foreground" 
                    colorKey="foreground" 
                    value={designSystem.colors.foreground} 
                  />
                  <ColorPicker 
                    label="Muted" 
                    colorKey="muted" 
                    value={designSystem.colors.muted} 
                  />
                  <ColorPicker 
                    label="Card" 
                    colorKey="card" 
                    value={designSystem.colors.card} 
                  />
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Eye className="w-5 h-5" />
                  Color Preview
                </CardTitle>
                <CardDescription>
                  See how your colors look in components
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-5 gap-2">
                  {Object.entries(designSystem.colors).map(([key, value]) => (
                    <div key={key} className="text-center">
                      <div 
                        className="w-8 h-8 rounded-md border mx-auto mb-1"
                        style={{ backgroundColor: value }}
                      />
                      <span className="text-xs capitalize">{key}</span>
                    </div>
                  ))}
                </div>
                <Separator />
                <div className="space-y-3">
                  <h4 className="font-medium">Button Preview</h4>
                  <div className="flex" style={{ gap: designSystem.spacing.baseUnit }}>
                    <Button size="sm">Primary</Button>
                    <Button variant="secondary" size="sm">Secondary</Button>
                    <Button variant="outline" size="sm">Outline</Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="typography">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Typography</CardTitle>
                <CardDescription>
                  Configure fonts and text styles
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="primary-font">Primary Font</Label>
                    <Input 
                      id="primary-font"
                      value={designSystem.typography.primaryFont}
                      onChange={(e) => setDesignSystem(prev => ({
                        ...prev,
                        typography: { ...prev.typography, primaryFont: e.target.value }
                      }))}
                      placeholder="Inter, sans-serif"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="secondary-font">Secondary Font</Label>
                    <Input 
                      id="secondary-font"
                      value={designSystem.typography.secondaryFont}
                      onChange={(e) => setDesignSystem(prev => ({
                        ...prev,
                        typography: { ...prev.typography, secondaryFont: e.target.value }
                      }))}
                      placeholder="Inter, sans-serif"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Eye className="w-5 h-5" />
                  Typography Preview
                </CardTitle>
                <CardDescription>
                  See how your fonts look in different elements
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <h1 className="text-2xl font-semibold" style={{ fontFamily: designSystem.typography.primaryFont, fontWeight: designSystem.typography.headingWeight }}>
                    Heading Example
                  </h1>
                  <h2 className="text-xl font-medium" style={{ fontFamily: designSystem.typography.primaryFont, fontWeight: designSystem.typography.headingWeight }}>
                    Subheading Example
                  </h2>
                  <p className="text-base" style={{ fontFamily: designSystem.typography.secondaryFont, fontWeight: designSystem.typography.bodyWeight }}>
                    Body text example using your typography settings. This shows how your font choices will appear in paragraphs and content.
                  </p>
                  <p className="text-sm text-muted-foreground" style={{ fontFamily: designSystem.typography.secondaryFont }}>
                    Smaller text and captions will use these font settings.
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="spacing">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Spacing & Layout</CardTitle>
                <CardDescription>
                  Configure spacing and border radius
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="base-unit">Base Spacing Unit</Label>
                    <Input 
                      id="base-unit"
                      value={designSystem.spacing.baseUnit}
                      onChange={(e) => setDesignSystem(prev => ({
                        ...prev,
                        spacing: { ...prev.spacing, baseUnit: e.target.value }
                      }))}
                      placeholder="4px"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="section-spacing">Section Spacing</Label>
                    <Input 
                      id="section-spacing"
                      value={designSystem.spacing.sectionSpacing}
                      onChange={(e) => setDesignSystem(prev => ({
                        ...prev,
                        spacing: { ...prev.spacing, sectionSpacing: e.target.value }
                      }))}
                      placeholder="32px"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="element-spacing">Element Spacing</Label>
                    <Input 
                      id="element-spacing"
                      value={designSystem.spacing.elementSpacing}
                      onChange={(e) => setDesignSystem(prev => ({
                        ...prev,
                        spacing: { ...prev.spacing, elementSpacing: e.target.value }
                      }))}
                      placeholder="16px"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="container-padding">Container Padding</Label>
                    <Input 
                      id="container-padding"
                      value={designSystem.spacing.containerPadding}
                      onChange={(e) => setDesignSystem(prev => ({
                        ...prev,
                        spacing: { ...prev.spacing, containerPadding: e.target.value }
                      }))}
                      placeholder="40px"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="border-radius">Base Border Radius</Label>
                    <Input 
                      id="border-radius"
                      value={designSystem.borderRadius.base}
                      onChange={(e) => setDesignSystem(prev => ({
                        ...prev,
                        borderRadius: { ...prev.borderRadius, base: e.target.value }
                      }))}
                      placeholder="8px"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Eye className="w-5 h-5" />
                  Spacing Preview
                </CardTitle>
                <CardDescription>
                  See how your spacing affects components
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <h4 className="font-medium">Element Spacing</h4>
                  <div className="flex" style={{ gap: designSystem.spacing.elementSpacing }}>
                    <Button size="sm">Button 1</Button>
                    <Button size="sm">Button 2</Button>
                    <Button size="sm">Button 3</Button>
                  </div>
                </div>
                <Separator />
                <div className="space-y-3">
                  <h4 className="font-medium">Container with Padding</h4>
                  <div style={{ 
                    padding: designSystem.spacing.containerPadding,
                    borderRadius: designSystem.borderRadius.base,
                    backgroundColor: 'var(--muted)',
                  }}>
                    <p className="text-sm">This container uses your custom padding and border radius settings.</p>
                  </div>
                </div>
                <Separator />
                <div className="space-y-2">
                  <h4 className="font-medium">Current Values</h4>
                  <p className="text-sm">Base unit: {designSystem.spacing.baseUnit}</p>
                  <p className="text-sm">Section spacing: {designSystem.spacing.sectionSpacing}</p>
                  <p className="text-sm">Element spacing: {designSystem.spacing.elementSpacing}</p>
                  <p className="text-sm">Container padding: {designSystem.spacing.containerPadding}</p>
                  <p className="text-sm">Base radius: {designSystem.borderRadius.base}</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="components">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="space-y-6">
              {/* Toast Configuration */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Settings className="w-5 h-5" />
                    Toast Notifications
                  </CardTitle>
                  <CardDescription>
                    Configure toast notification appearance and behavior
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Toast Position</Label>
                      <Select 
                        value={designSystem.components.toast.position}
                        onValueChange={(value: any) => setDesignSystem(prev => ({
                          ...prev,
                          components: {
                            ...prev.components,
                            toast: { ...prev.components.toast, position: value }
                          }
                        }))}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="top-left">Top Left</SelectItem>
                          <SelectItem value="top-center">Top Center</SelectItem>
                          <SelectItem value="top-right">Top Right</SelectItem>
                          <SelectItem value="bottom-left">Bottom Left</SelectItem>
                          <SelectItem value="bottom-center">Bottom Center</SelectItem>
                          <SelectItem value="bottom-right">Bottom Right</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Toast Style</Label>
                      <Select 
                        value={designSystem.components.toast.style}
                        onValueChange={(value: any) => setDesignSystem(prev => ({
                          ...prev,
                          components: {
                            ...prev.components,
                            toast: { ...prev.components.toast, style: value }
                          }
                        }))}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="default">Default</SelectItem>
                          <SelectItem value="minimal">Minimal</SelectItem>
                          <SelectItem value="rounded">Rounded</SelectItem>
                          <SelectItem value="sharp">Sharp</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="toast-radius">Toast Border Radius</Label>
                      <Input 
                        id="toast-radius"
                        value={designSystem.components.toast.borderRadius}
                        onChange={(e) => setDesignSystem(prev => ({
                          ...prev,
                          components: {
                            ...prev.components,
                            toast: { ...prev.components.toast, borderRadius: e.target.value }
                          }
                        }))}
                        placeholder="8px"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="toast-padding">Toast Padding</Label>
                      <Input 
                        id="toast-padding"
                        value={designSystem.components.toast.padding}
                        onChange={(e) => setDesignSystem(prev => ({
                          ...prev,
                          components: {
                            ...prev.components,
                            toast: { ...prev.components.toast, padding: e.target.value }
                          }
                        }))}
                        placeholder="16px"
                      />
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    onClick={() => showToast('This is a test toast with your current settings!')}
                  >
                    Test Toast
                  </Button>
                </CardContent>
              </Card>

              {/* Card Configuration */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Layout className="w-5 h-5" />
                    Card Components
                  </CardTitle>
                  <CardDescription>
                    Configure card appearance and styling
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Card Shadow</Label>
                      <Select 
                        value={designSystem.components.card.shadow}
                        onValueChange={(value: any) => setDesignSystem(prev => ({
                          ...prev,
                          components: {
                            ...prev.components,
                            card: { ...prev.components.card, shadow: value }
                          }
                        }))}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">None</SelectItem>
                          <SelectItem value="sm">Small</SelectItem>
                          <SelectItem value="md">Medium</SelectItem>
                          <SelectItem value="lg">Large</SelectItem>
                          <SelectItem value="xl">Extra Large</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Card Border</Label>
                      <Select 
                        value={designSystem.components.card.border}
                        onValueChange={(value: any) => setDesignSystem(prev => ({
                          ...prev,
                          components: {
                            ...prev.components,
                            card: { ...prev.components.card, border: value }
                          }
                        }))}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">None</SelectItem>
                          <SelectItem value="subtle">Subtle</SelectItem>
                          <SelectItem value="strong">Strong</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="card-radius">Card Border Radius</Label>
                      <Input 
                        id="card-radius"
                        value={designSystem.components.card.borderRadius}
                        onChange={(e) => setDesignSystem(prev => ({
                          ...prev,
                          components: {
                            ...prev.components,
                            card: { ...prev.components.card, borderRadius: e.target.value }
                          }
                        }))}
                        placeholder="12px"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="card-padding">Card Padding</Label>
                      <Input 
                        id="card-padding"
                        value={designSystem.components.card.padding}
                        onChange={(e) => setDesignSystem(prev => ({
                          ...prev,
                          components: {
                            ...prev.components,
                            card: { ...prev.components.card, padding: e.target.value }
                          }
                        }))}
                        placeholder="24px"
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Button Configuration */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Layers className="w-5 h-5" />
                    Button Components
                  </CardTitle>
                  <CardDescription>
                    Configure button appearance and behavior
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Button Style</Label>
                      <Select 
                        value={designSystem.components.buttons.style}
                        onValueChange={(value: any) => setDesignSystem(prev => ({
                          ...prev,
                          components: {
                            ...prev.components,
                            buttons: { ...prev.components.buttons, style: value }
                          }
                        }))}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="default">Default</SelectItem>
                          <SelectItem value="rounded">Rounded</SelectItem>
                          <SelectItem value="sharp">Sharp</SelectItem>
                          <SelectItem value="pill">Pill</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Default Button Size</Label>
                      <Select 
                        value={designSystem.components.buttons.size}
                        onValueChange={(value: any) => setDesignSystem(prev => ({
                          ...prev,
                          components: {
                            ...prev.components,
                            buttons: { ...prev.components.buttons, size: value }
                          }
                        }))}
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
                      <Label htmlFor="button-spacing">Button Spacing</Label>
                      <Input 
                        id="button-spacing"
                        value={designSystem.components.buttons.spacing}
                        onChange={(e) => setDesignSystem(prev => ({
                          ...prev,
                          components: {
                            ...prev.components,
                            buttons: { ...prev.components.buttons, spacing: e.target.value }
                          }
                        }))}
                        placeholder="8px"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="button-radius">Button Border Radius</Label>
                      <Input 
                        id="button-radius"
                        value={designSystem.components.buttons.borderRadius}
                        onChange={(e) => setDesignSystem(prev => ({
                          ...prev,
                          components: {
                            ...prev.components,
                            buttons: { ...prev.components.buttons, borderRadius: e.target.value }
                          }
                        }))}
                        placeholder="6px"
                      />
                    </div>
                    <div className="space-y-2 col-span-2">
                      <Label htmlFor="button-padding">Button Padding</Label>
                      <Input 
                        id="button-padding"
                        value={designSystem.components.buttons.padding}
                        onChange={(e) => setDesignSystem(prev => ({
                          ...prev,
                          components: {
                            ...prev.components,
                            buttons: { ...prev.components.buttons, padding: e.target.value }
                          }
                        }))}
                        placeholder="12px 16px"
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
            
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Eye className="w-5 h-5" />
                  Component Preview
                </CardTitle>
                <CardDescription>
                  See how your settings affect components
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-4">
                  <h4 className="font-medium">Buttons</h4>
                  <div className="space-y-3">
                    <div className="flex" style={{ gap: designSystem.components.buttons.spacing }}>
                      <Button 
                        size={designSystem.components.buttons.size as any}
                      >
                        Primary
                      </Button>
                      <Button 
                        variant="secondary" 
                        size={designSystem.components.buttons.size as any}
                      >
                        Secondary
                      </Button>
                      <Button 
                        variant="outline" 
                        size={designSystem.components.buttons.size as any}
                      >
                        Outline
                      </Button>
                    </div>
                    <div className="flex" style={{ gap: designSystem.components.buttons.spacing }}>
                      <Button 
                        variant="destructive" 
                        size={designSystem.components.buttons.size as any}
                      >
                        Destructive
                      </Button>
                      <Button 
                        variant="ghost" 
                        size={designSystem.components.buttons.size as any}
                      >
                        Ghost
                      </Button>
                    </div>
                  </div>
                </div>
                
                <Separator />
                
                <div className="space-y-4">
                  <h4 className="font-medium">Cards</h4>
                  <Card 
                    className={`p-4 shadow-${designSystem.components.card.shadow} ${
                      designSystem.components.card.border === 'none' ? 'border-0' :
                      designSystem.components.card.border === 'strong' ? 'border-2' : ''
                    }`}
                  >
                    <CardHeader className="p-0 pb-3">
                      <CardTitle className="text-base">Sample Card</CardTitle>
                      <CardDescription>This card reflects your design system settings</CardDescription>
                    </CardHeader>
                    <p className="text-sm">Card content with custom styling applied.</p>
                  </Card>
                </div>

                <Separator />

                <div className="space-y-4">
                  <h4 className="font-medium">Toast Settings</h4>
                  <div className="space-y-2">
                    <p className="text-sm text-muted-foreground">
                      Position: {designSystem.components.toast.position.replace('-', ' ')}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Style: {designSystem.components.toast.style}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="interactions">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Interactions & Animations</CardTitle>
                <CardDescription>
                  Configure hover effects, transitions, and animations
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Icon Style</Label>
                    <Select 
                      value={designSystem.components.icons.style}
                      onValueChange={(value: any) => setDesignSystem(prev => ({
                        ...prev,
                        components: {
                          ...prev.components,
                          icons: { ...prev.components.icons, style: value }
                        }
                      }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="outline">Outline</SelectItem>
                        <SelectItem value="filled">Filled</SelectItem>
                        <SelectItem value="duotone">Duotone</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Default Icon Size</Label>
                    <Select 
                      value={designSystem.components.icons.size}
                      onValueChange={(value: any) => setDesignSystem(prev => ({
                        ...prev,
                        components: {
                          ...prev.components,
                          icons: { ...prev.components.icons, size: value }
                        }
                      }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="sm">Small (16px)</SelectItem>
                        <SelectItem value="md">Medium (20px)</SelectItem>
                        <SelectItem value="lg">Large (24px)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Eye className="w-5 h-5" />
                  Icons Preview
                </CardTitle>
                <CardDescription>
                  See how your icon settings affect the interface
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <h4 className="font-medium">Icon Sizes</h4>
                  <div className="flex items-center" style={{ gap: designSystem.spacing.baseUnit }}>
                    <Settings className={`${designSystem.components.icons.size === 'sm' ? 'w-4 h-4' : designSystem.components.icons.size === 'lg' ? 'w-6 h-6' : 'w-5 h-5'}`} />
                    <Palette className={`${designSystem.components.icons.size === 'sm' ? 'w-4 h-4' : designSystem.components.icons.size === 'lg' ? 'w-6 h-6' : 'w-5 h-5'}`} />
                    <Layout className={`${designSystem.components.icons.size === 'sm' ? 'w-4 h-4' : designSystem.components.icons.size === 'lg' ? 'w-6 h-6' : 'w-5 h-5'}`} />
                    <Layers className={`${designSystem.components.icons.size === 'sm' ? 'w-4 h-4' : designSystem.components.icons.size === 'lg' ? 'w-6 h-6' : 'w-5 h-5'}`} />
                  </div>
                </div>
                <Separator />
                <div className="space-y-2">
                  <h4 className="font-medium">Current Settings</h4>
                  <p className="text-sm">Style: {designSystem.components.icons.style}</p>
                  <p className="text-sm">Size: {designSystem.components.icons.size === 'sm' ? '16px' : designSystem.components.icons.size === 'lg' ? '24px' : '20px'}</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

      </Tabs>

      <div className="flex justify-between">
        <div className="flex gap-2">
          <Button variant="outline" className="flex items-center gap-2">
            <Upload className="w-4 h-4" />
            Import
          </Button>
          <Button variant="outline" className="flex items-center gap-2">
            <Download className="w-4 h-4" />
            Export
          </Button>
        </div>
        
        <Button 
          className="flex items-center gap-2" 
          onClick={handleSaveDesignSystem}
          disabled={updateDesignSystemMutation.isPending || isLoading}
        >
          <Save className="w-4 h-4" />
          {updateDesignSystemMutation.isPending ? 'Saving...' : 'Save Design System'}
        </Button>
      </div>
    </div>
  );
};