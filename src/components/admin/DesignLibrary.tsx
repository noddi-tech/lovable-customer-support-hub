import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Progress } from '@/components/ui/progress';
import { Slider } from '@/components/ui/slider';
import { Checkbox } from '@/components/ui/checkbox';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { useToast } from '@/hooks/use-toast';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useDesignSystem } from '@/contexts/DesignSystemContext';
import { DesignLibraryComponents } from './DesignLibraryComponents';
import { ComponentConfigurationPanel } from './ComponentConfigurationPanel';
import { logger } from '@/utils/logger';
import { useErrorHandler } from '@/hooks/useErrorHandler';
import { ResponsiveContainer, ResponsiveTabs, ResponsiveGrid, ResponsiveFlex, AdaptiveSection } from '../design/components/layouts';

// Proper WCAG contrast calculation
const getOptimalTextColor = (hslBackground: string, opacity: number = 1): string => {
  // Parse HSL values - handle both "h s l" and "h s% l%" formats
  const parts = hslBackground.trim().split(/\s+/);
  const h = parseFloat(parts[0]) || 0;
  const s = parseFloat(parts[1].replace('%', '')) || 0;
  const l = parseFloat(parts[2].replace('%', '')) || 0;
  
  // Convert HSL to RGB
  const hue = h / 360;
  const sat = s / 100;
  const light = l / 100;
  
  const c = (1 - Math.abs(2 * light - 1)) * sat;
  const x = c * (1 - Math.abs(((hue * 6) % 2) - 1));
  const m = light - c / 2;
  
  let r = 0, g = 0, b = 0;
  
  if (0 <= hue && hue < 1/6) {
    r = c; g = x; b = 0;
  } else if (1/6 <= hue && hue < 2/6) {
    r = x; g = c; b = 0;
  } else if (2/6 <= hue && hue < 3/6) {
    r = 0; g = c; b = x;
  } else if (3/6 <= hue && hue < 4/6) {
    r = 0; g = x; b = c;
  } else if (4/6 <= hue && hue < 5/6) {
    r = x; g = 0; b = c;
  } else if (5/6 <= hue && hue < 1) {
    r = c; g = 0; b = x;
  }
  
  r = Math.round((r + m) * 255);
  g = Math.round((g + m) * 255);
  b = Math.round((b + m) * 255);
  
  // Calculate relative luminance using WCAG formula
  const linearize = (c: number) => {
    c = c / 255;
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  };
  
  const luminance = 0.2126 * linearize(r) + 0.7152 * linearize(g) + 0.0722 * linearize(b);
  
  // Calculate contrast ratios for white and black text
  const whiteLuminance = 1;
  const blackLuminance = 0;
  
  const contrastWithWhite = (whiteLuminance + 0.05) / (luminance + 0.05);
  const contrastWithBlack = (luminance + 0.05) / (blackLuminance + 0.05);
  
  // Choose the color with better contrast (minimum 4.5:1 for WCAG AA)
  const useWhiteText = contrastWithWhite > contrastWithBlack;
  
  const alphaValue = opacity < 1 ? ` / ${opacity}` : '';
  
  logger.debug('Background color analysis', { 
    hsl: `${h} ${s}% ${l}%`, 
    rgb: `(${r}, ${g}, ${b})`, 
    luminance, 
    textColor: useWhiteText ? 'white' : 'black' 
  }, 'DesignLibrary');
  
  return useWhiteText 
    ? `hsl(0 0% 100%${alphaValue})` // Pure white
    : `hsl(0 0% 0%${alphaValue})`; // Pure black
};
import { 
  Save, 
  Palette, 
  Heart,
  Star,
  Send,
  Settings,
  User,
  Mail,
  Bell,
  Home,
  Search,
  Plus,
  Trash2,
  Edit,
  Eye,
  Download,
  Upload,
  RefreshCw,
  Check,
  X,
  AlertTriangle,
  Info,
  HelpCircle,
  ChevronRight,
  Calendar,
  Clock
} from 'lucide-react';

export const DesignLibrary = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { handleError } = useErrorHandler();
  const { designSystem, updateDesignSystem, saveDesignSystem, isLoading } = useDesignSystem();
  
  // Demo state for interactive examples
  const [demoInputValue, setDemoInputValue] = useState('Sample text');
  const [demoTextareaValue, setDemoTextareaValue] = useState('This is a sample textarea content...');
  const [demoSwitchValue, setDemoSwitchValue] = useState(false);
  const [demoSelectValue, setDemoSelectValue] = useState('option1');
  const [demoSliderValue, setDemoSliderValue] = useState([50]);
  const [demoCheckboxValue, setDemoCheckboxValue] = useState(false);
  const [demoRadioValue, setDemoRadioValue] = useState('option1');
  const [demoProgress, setDemoProgress] = useState(65);

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
      handleError(error, {
        title: "Error saving design system",
        fallbackMessage: "There was an error saving your design system. Please try again.",
        component: 'DesignLibrary'
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

  const showDemoToast = (type: 'default' | 'success' | 'destructive') => {
    switch (type) {
      case 'success':
        toast({
          title: "Success!",
          description: "This is a success message.",
        });
        break;
      case 'destructive':
        toast({
          title: "Error!",
          description: "Something went wrong.",
          variant: "destructive",
        });
        break;
      default:
        toast({
          title: "Notification",
          description: "This is a default message.",
        });
    }
  };

  // Core color system - no foreground colors (handled by auto contrast)
  const colorInputs = [
    { key: 'primary' as const, label: 'Primary', description: 'Main brand color' },
    { key: 'secondary' as const, label: 'Secondary', description: 'Secondary actions' },
    { key: 'accent' as const, label: 'Accent', description: 'Accent highlights' },
    { key: 'background' as const, label: 'Background', description: 'Page background' },
    { key: 'muted' as const, label: 'Muted', description: 'Subtle backgrounds' },
    { key: 'card' as const, label: 'Card', description: 'Card backgrounds' },
    { key: 'border' as const, label: 'Border', description: 'Border color' },
    { key: 'success' as const, label: 'Success', description: 'Success states' },
    { key: 'warning' as const, label: 'Warning', description: 'Warning states' },
    { key: 'destructive' as const, label: 'Destructive', description: 'Error states' },
  ];

  // Convert hex to HSL
  const hexToHsl = (hex: string): string => {
    // Remove # if present
    hex = hex.replace('#', '');
    
    // Convert hex to RGB
    const r = parseInt(hex.substr(0, 2), 16) / 255;
    const g = parseInt(hex.substr(2, 2), 16) / 255;
    const b = parseInt(hex.substr(4, 2), 16) / 255;
    
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    let h = 0, s = 0, l = (max + min) / 2;
    
    if (max === min) {
      h = s = 0; // achromatic
    } else {
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

  // Convert HSL to hex
  const hslToHex = (hsl: string): string => {
    const parts = hsl.trim().split(/\s+/);
    const h = parseFloat(parts[0]) / 360;
    const s = parseFloat(parts[1].replace('%', '')) / 100;
    const l = parseFloat(parts[2].replace('%', '')) / 100;
    
    const hue2rgb = (p: number, q: number, t: number) => {
      if (t < 0) t += 1;
      if (t > 1) t -= 1;
      if (t < 1/6) return p + (q - p) * 6 * t;
      if (t < 1/2) return q;
      if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
      return p;
    };
    
    let r, g, b;
    
    if (s === 0) {
      r = g = b = l; // achromatic
    } else {
      const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
      const p = 2 * l - q;
      r = hue2rgb(p, q, h + 1/3);
      g = hue2rgb(p, q, h);
      b = hue2rgb(p, q, h - 1/3);
    }
    
    const toHex = (c: number) => {
      const hex = Math.round(c * 255).toString(16);
      return hex.length === 1 ? '0' + hex : hex;
    };
    
    return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
  };

  const EnhancedColorPicker = ({ label, value, onChange, description }: {
    label: string;
    value: string;
    onChange: (value: string) => void;
    description: string;
  }) => {
    const [hexValue, setHexValue] = useState(hslToHex(value));
    
    const handleHslChange = (newHslValue: string) => {
      onChange(newHslValue);
      setHexValue(hslToHex(newHslValue));
    };
    
    const handleHexChange = (newHexValue: string) => {
      setHexValue(newHexValue);
      if (newHexValue.length === 7 && newHexValue.startsWith('#')) {
        const hslValue = hexToHsl(newHexValue);
        onChange(hslValue);
      }
    };
    
    const handleColorPickerChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const newHexValue = e.target.value;
      setHexValue(newHexValue);
      const hslValue = hexToHsl(newHexValue);
      onChange(hslValue);
    };
    
    return (
      <AdaptiveSection spacing="3">
        <Label className="text-sm font-medium">{label}</Label>
        
        {/* Color Preview and Picker */}
        <ResponsiveFlex gap="2" alignment="center">
          <input
            type="color"
            value={hexValue}
            onChange={handleColorPickerChange}
            className="w-12 h-12 rounded border-2 border-border cursor-pointer"
            title="Click to open color picker"
          />
          <div 
            className="w-12 h-12 rounded border-2 border-border"
            style={{ backgroundColor: `hsl(${value})` }}
            title="Color preview"
          />
          <AdaptiveSection spacing="2" className="flex-1">
            <Input
              value={hexValue}
              onChange={(e) => handleHexChange(e.target.value)}
              placeholder="#3b82f6"
              className="uppercase"
              title="Hex color code"
            />
            <Input
              value={value}
              onChange={(e) => handleHslChange(e.target.value)}
              placeholder="217 91% 60%"
              title="HSL values (H S% L%)"
            />
          </AdaptiveSection>
        </ResponsiveFlex>
        
        <p className="text-xs text-muted-foreground">{description}</p>
      </AdaptiveSection>
    );
  };

  const GradientEditor = ({ label, value, onChange, description }: {
    label: string;
    value: string;
    onChange: (value: string) => void;
    description: string;
  }) => (
    <AdaptiveSection spacing="2">
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
    </AdaptiveSection>
  );

  const designTabs = [
    {
      value: 'preview',
      label: 'Preview',
      content: (
        <AdaptiveSection spacing="8">
          <AdaptiveSection spacing="6">
            <AdaptiveSection spacing="2">
              <h3 className="text-lg font-semibold mb-4">Live Component Preview</h3>
              <p className="text-muted-foreground">
                See how your design system changes affect all components in real-time
              </p>
            </AdaptiveSection>

            <DesignLibraryComponents 
              demoInputValue={demoInputValue}
              setDemoInputValue={setDemoInputValue}
              demoTextareaValue={demoTextareaValue}
              setDemoTextareaValue={setDemoTextareaValue}
              demoSwitchValue={demoSwitchValue}
              setDemoSwitchValue={setDemoSwitchValue}
              demoSelectValue={demoSelectValue}
              setDemoSelectValue={setDemoSelectValue}
              demoSliderValue={demoSliderValue}
              setDemoSliderValue={setDemoSliderValue}
              demoCheckboxValue={demoCheckboxValue}
              setDemoCheckboxValue={setDemoCheckboxValue}
              demoRadioValue={demoRadioValue}
              setDemoRadioValue={setDemoRadioValue}
              demoProgress={demoProgress}
              showDemoToast={showDemoToast}
            />
          </AdaptiveSection>
        </AdaptiveSection>
      )
    },
    {
      value: 'colors',
      label: 'Colors',
      content: (
        <ResponsiveGrid gap="6">
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
            <CardContent>
              <AdaptiveSection spacing="6">
                <ResponsiveGrid cols={{ sm: '1', md: '2', lg: '3' }} gap="4">
                  {colorInputs.map((input) => (
                    <EnhancedColorPicker
                      key={input.key}
                      label={input.label}
                      value={designSystem.colors[input.key]}
                      onChange={(value) => updateColor(input.key, value)}
                      description={input.description}
                    />
                  ))}
                </ResponsiveGrid>

                <Separator />

                <AdaptiveSection spacing="4">
                  <h4 className="text-lg font-medium">Gradients</h4>
                  <ResponsiveGrid cols={{ sm: '1', md: '2' }} gap="4">
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
                  </ResponsiveGrid>
                </AdaptiveSection>
              </AdaptiveSection>
            </CardContent>
          </Card>
        </ResponsiveGrid>
      )
    },
    {
      value: 'components',
      label: 'Components',
      content: <ComponentConfigurationPanel />
    }
  ];

  return (
    <ResponsiveContainer className="pane" padding={{ sm: '4', md: '6' }}>
      <AdaptiveSection spacing={{ sm: '4', md: '6' }}>
        <AdaptiveSection spacing="2">
          <h3 className="text-lg font-semibold text-primary">Design Library</h3>
          <p className="text-muted-foreground">
            Manage your organization's design system and component library with live preview
          </p>
        </AdaptiveSection>

        <ResponsiveTabs
          items={designTabs}
          defaultValue="preview"
          orientation="responsive"
          breakpoint="lg"
          variant="default"
        />

        <ResponsiveFlex justify="end">
          <Button
            onClick={saveToDatabase}
            disabled={saveMutation.isPending || isLoading}
            className="w-full md:w-auto"
          >
            <Save className="w-4 h-4 mr-2" />
            {saveMutation.isPending ? 'Saving...' : 'Save to Database'}
          </Button>
        </ResponsiveFlex>
      </AdaptiveSection>
    </ResponsiveContainer>
  );
};