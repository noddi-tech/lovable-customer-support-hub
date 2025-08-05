import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
          Manage your organization's design system and component library with live preview
        </p>
      </div>

      <Tabs defaultValue="preview" className="space-y-6">
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="preview">Preview</TabsTrigger>
          <TabsTrigger value="colors">Colors</TabsTrigger>
          <TabsTrigger value="typography">Typography</TabsTrigger>
          <TabsTrigger value="spacing">Spacing</TabsTrigger>
          <TabsTrigger value="components">Components</TabsTrigger>
          <TabsTrigger value="config">Config</TabsTrigger>
        </TabsList>

        {/* Component Preview Section */}
        <TabsContent value="preview" className="space-y-8">
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold mb-4">Live Component Preview</h3>
              <p className="text-muted-foreground">
                See how your design system changes affect all components in real-time
              </p>
            </div>

            {/* Buttons Section */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Heart className="w-5 h-5" />
                  Buttons
                </CardTitle>
                <CardDescription>
                  All button variants and states with your current design system
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-4">
                  <h4 className="text-sm font-medium">Button Variants</h4>
                  <div className="flex flex-wrap gap-3">
                    <Button variant="default">Default</Button>
                    <Button variant="secondary">Secondary</Button>
                    <Button variant="destructive">Destructive</Button>
                    <Button variant="outline">Outline</Button>
                    <Button variant="ghost">Ghost</Button>
                    <Button variant="link">Link</Button>
                  </div>
                </div>

                <Separator />

                <div className="space-y-4">
                  <h4 className="text-sm font-medium">Button Sizes</h4>
                  <div className="flex flex-wrap items-center gap-3">
                    <Button size="sm">Small</Button>
                    <Button size="default">Default</Button>
                    <Button size="lg">Large</Button>
                    <Button size="icon">
                      <Heart className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                <Separator />

                <div className="space-y-4">
                  <h4 className="text-sm font-medium">Buttons with Icons</h4>
                  <div className="flex flex-wrap gap-3">
                    <Button>
                      <Send className="h-4 w-4 mr-2" />
                      Send Message
                    </Button>
                    <Button variant="outline">
                      <Settings className="h-4 w-4 mr-2" />
                      Settings
                    </Button>
                    <Button variant="secondary">
                      <Star className="h-4 w-4 mr-2" />
                      Favorite
                    </Button>
                    <Button variant="destructive">
                      <Trash2 className="h-4 w-4 mr-2" />
                      Delete
                    </Button>
                  </div>
                </div>

                <Separator />

                <div className="space-y-4">
                  <h4 className="text-sm font-medium">Button States</h4>
                  <div className="flex flex-wrap gap-3">
                    <Button disabled>Disabled</Button>
                    <Button variant="outline" disabled>Disabled Outline</Button>
                    <Button className="animate-pulse">
                      <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                      Loading
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Badges Section */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Star className="w-5 h-5" />
                  Badges
                </CardTitle>
                <CardDescription>
                  Status indicators and labels with different variants
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-4">
                  <h4 className="text-sm font-medium">Badge Variants</h4>
                  <div className="flex flex-wrap gap-3">
                    <Badge variant="default">Default</Badge>
                    <Badge variant="secondary">Secondary</Badge>
                    <Badge variant="destructive">Destructive</Badge>
                    <Badge variant="outline">Outline</Badge>
                  </div>
                </div>

                <Separator />

                <div className="space-y-4">
                  <h4 className="text-sm font-medium">Status Badges</h4>
                  <div className="flex flex-wrap gap-3">
                    <Badge className="bg-success text-success-foreground">
                      <Check className="h-3 w-3 mr-1" />
                      Success
                    </Badge>
                    <Badge className="bg-warning text-warning-foreground">
                      <AlertTriangle className="h-3 w-3 mr-1" />
                      Warning
                    </Badge>
                    <Badge variant="destructive">
                      <X className="h-3 w-3 mr-1" />
                      Error
                    </Badge>
                    <Badge variant="secondary">
                      <Clock className="h-3 w-3 mr-1" />
                      Pending
                    </Badge>
                    <Badge variant="outline">
                      <Info className="h-3 w-3 mr-1" />
                      Info
                    </Badge>
                  </div>
                </div>

                <Separator />

                <div className="space-y-4">
                  <h4 className="text-sm font-medium">Interactive Badges</h4>
                  <div className="flex flex-wrap gap-3">
                    <Badge className="hover:bg-primary/80 cursor-pointer transition-colors">
                      Clickable
                    </Badge>
                    <Badge variant="outline" className="hover:bg-accent cursor-pointer transition-colors">
                      Hover me
                    </Badge>
                    <Badge className="bg-gradient-primary">
                      Gradient
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Cards Section */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="w-5 h-5" />
                  Cards
                </CardTitle>
                <CardDescription>
                  Card layouts and content containers
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  <Card>
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

                  <Card className="bg-primary text-primary-foreground">
                    <CardHeader>
                      <CardTitle>Primary Card</CardTitle>
                      <CardDescription className="text-primary-foreground/70">
                        A card with primary background
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm opacity-90">
                        This card uses the primary color scheme.
                      </p>
                    </CardContent>
                  </Card>

                  <Card className="bg-gradient-surface border-primary/20">
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
              </CardContent>
            </Card>

            {/* Additional Form Components */}
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
          </div>
        </TabsContent>

        <TabsContent value="config">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Palette className="w-5 h-5" />
                Design System Configuration
              </CardTitle>
              <CardDescription>
                Configure your organization's design system settings
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
        </TabsContent>

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
          <ComponentConfigurationPanel />
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