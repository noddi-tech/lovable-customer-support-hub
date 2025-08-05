import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Save, Palette, Eye, Download, Upload } from 'lucide-react';
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
  };
  typography: {
    primaryFont: string;
    secondaryFont: string;
  };
  spacing: {
    baseUnit: string;
  };
  borderRadius: {
    base: string;
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
    },
    typography: {
      primaryFont: 'Inter',
      secondaryFont: 'Inter',
    },
    spacing: {
      baseUnit: '4px',
    },
    borderRadius: {
      base: '8px',
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
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="colors">Colors</TabsTrigger>
          <TabsTrigger value="typography">Typography</TabsTrigger>
          <TabsTrigger value="spacing">Spacing</TabsTrigger>
          <TabsTrigger value="preview">Preview</TabsTrigger>
        </TabsList>

        <TabsContent value="colors">
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
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="typography">
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
        </TabsContent>

        <TabsContent value="spacing">
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
                  <Label htmlFor="border-radius">Border Radius</Label>
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
        </TabsContent>

        <TabsContent value="preview">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Eye className="w-5 h-5" />
                Component Preview
              </CardTitle>
              <CardDescription>
                See how your design system affects components
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <h4 className="font-medium">Buttons</h4>
                  <div className="flex gap-2">
                    <Button>Primary</Button>
                    <Button variant="secondary">Secondary</Button>
                    <Button variant="outline">Outline</Button>
                  </div>
                </div>
                <div className="space-y-2">
                  <h4 className="font-medium">Cards</h4>
                  <Card className="p-4">
                    <p className="text-sm">Sample card content with your design system applied.</p>
                  </Card>
                </div>
              </div>
            </CardContent>
          </Card>
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