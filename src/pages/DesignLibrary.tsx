import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { 
  CheckCircle, 
  XCircle, 
  AlertTriangle, 
  Clock, 
  Star, 
  Send,
  Settings,
  Home,
  MessageSquare,
  Users,
  BarChart,
  Heart,
  ThumbsUp,
  Zap
} from 'lucide-react';

const DesignLibrary = () => {
  const { toast } = useToast();
  const [inputValue, setInputValue] = useState('');
  const [textareaValue, setTextareaValue] = useState('');
  const [switchValue, setSwitchValue] = useState(false);

  // Color state for customization
  const [colors, setColors] = useState({
    primary: '#3b82f6',
    primaryForeground: '#fafafa',
    secondary: '#f1f5f9',
    secondaryForeground: '#64748b',
    success: '#22c55e',
    warning: '#eab308',
    destructive: '#ef4444',
    background: '#fdfdfe',
    card: '#ffffff',
    muted: '#f1f5f9',
    accent: '#e0f2fe',
    foreground: '#0f172a',
    mutedForeground: '#64748b',
    border: '#e2e8f0',
  });

  // Convert hex to HSL
  const hexToHsl = (hex: string): string => {
    // Remove the hash if it exists
    hex = hex.replace('#', '');
    
    // Parse the hex values
    const r = parseInt(hex.substr(0, 2), 16) / 255;
    const g = parseInt(hex.substr(2, 2), 16) / 255;
    const b = parseInt(hex.substr(4, 2), 16) / 255;

    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    let h = 0;
    let s = 0;
    const l = (max + min) / 2;

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

  // Update CSS custom properties
  const updateCSSVariable = (property: string, value: string) => {
    document.documentElement.style.setProperty(`--${property}`, hexToHsl(value));
  };

  // Handle color change
  const handleColorChange = (colorKey: string, newColor: string) => {
    setColors(prev => ({ ...prev, [colorKey]: newColor }));
    
    // Map color keys to CSS custom property names
    const cssPropertyMap: { [key: string]: string } = {
      primary: 'primary',
      primaryForeground: 'primary-foreground',
      secondary: 'secondary',
      secondaryForeground: 'secondary-foreground',
      success: 'success',
      warning: 'warning',
      destructive: 'destructive',
      background: 'background',
      card: 'card',
      muted: 'muted',
      accent: 'accent',
      foreground: 'foreground',
      mutedForeground: 'muted-foreground',
      border: 'border',
    };

    const cssProperty = cssPropertyMap[colorKey];
    if (cssProperty) {
      updateCSSVariable(cssProperty, newColor);
    }
  };

  // Reset colors to defaults
  const resetColors = () => {
    const defaultColors = {
      primary: '#3b82f6',
      primaryForeground: '#fafafa',
      secondary: '#f1f5f9',
      secondaryForeground: '#64748b',
      success: '#22c55e',
      warning: '#eab308',
      destructive: '#ef4444',
      background: '#fdfdfe',
      card: '#ffffff',
      muted: '#f1f5f9',
      accent: '#e0f2fe',
      foreground: '#0f172a',
      mutedForeground: '#64748b',
      border: '#e2e8f0',
    };

    setColors(defaultColors);
    Object.entries(defaultColors).forEach(([key, value]) => {
      handleColorChange(key, value);
    });

    toast({
      title: "Colors Reset",
      description: "All colors have been reset to their default values.",
    });
  };

  // Color picker component
  const ColorPicker = ({ label, colorKey, description, hslValue }: { 
    label: string; 
    colorKey: string; 
    description: string;
    hslValue: string;
  }) => (
    <div className="space-y-2">
      <div 
        className="h-16 w-full rounded-lg border cursor-pointer relative group overflow-hidden"
        style={{ backgroundColor: colors[colorKey as keyof typeof colors] }}
      >
        <input
          type="color"
          value={colors[colorKey as keyof typeof colors]}
          onChange={(e) => handleColorChange(colorKey, e.target.value)}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
        />
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors flex items-center justify-center pointer-events-none">
          <span className="text-white/0 group-hover:text-white/80 text-xs font-medium transition-colors">
            Click to edit
          </span>
        </div>
      </div>
      <div className="text-xs space-y-1">
        <div className="font-medium">{label}</div>
        <div className="text-muted-foreground">{description}</div>
        <div className="text-muted-foreground">HSL({hslValue})</div>
        <div className="flex items-center space-x-2">
          <input
            type="text"
            value={colors[colorKey as keyof typeof colors]}
            onChange={(e) => handleColorChange(colorKey, e.target.value)}
            className="text-xs bg-muted px-2 py-1 rounded border text-muted-foreground font-mono"
            placeholder="#000000"
          />
        </div>
      </div>
    </div>
  );

  const showToast = (type: string) => {
    switch (type) {
      case 'success':
        toast({
          title: "Success!",
          description: "This is a success message.",
        });
        break;
      case 'error':
        toast({
          title: "Error!",
          description: "Something went wrong.",
          variant: "destructive",
        });
        break;
      case 'default':
        toast({
          title: "Notification",
          description: "This is a default message.",
        });
        break;
    }
  };

  const MessageErrorToast = ({ children }: { children: React.ReactNode }) => (
    <div className="bg-destructive/10 border border-destructive/20 rounded-md p-3">
      <div className="flex items-center space-x-2">
        <AlertTriangle className="h-4 w-4 text-destructive" />
        <span className="text-sm text-destructive font-medium">
          {children}
        </span>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b border-border bg-card p-6">
        <div className="max-w-7xl mx-auto">
          <h1 className="text-3xl font-bold text-foreground">Design Library</h1>
          <p className="text-muted-foreground mt-2">
            A comprehensive collection of all UI components used throughout the application.
          </p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto p-6">
        <Tabs defaultValue="colors" className="space-y-6">
          <TabsList className="grid w-full grid-cols-7">
            <TabsTrigger value="colors">Colors</TabsTrigger>
            <TabsTrigger value="buttons">Buttons</TabsTrigger>
            <TabsTrigger value="forms">Forms</TabsTrigger>
            <TabsTrigger value="cards">Cards</TabsTrigger>
            <TabsTrigger value="badges">Badges</TabsTrigger>
            <TabsTrigger value="feedback">Feedback</TabsTrigger>
            <TabsTrigger value="icons">Icons</TabsTrigger>
          </TabsList>

          {/* Colors Section */}
          <TabsContent value="colors" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  Color Palette
                  <Button onClick={resetColors} variant="outline" size="sm">
                    Reset to Defaults
                  </Button>
                </CardTitle>
                <CardDescription>
                  Interactive color palette - click any color or use hex inputs to customize your design system in real-time
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-8">
                {/* Primary Colors */}
                <div className="space-y-4">
                  <h4 className="text-sm font-medium">Primary Colors</h4>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <ColorPicker
                      label="Primary"
                      colorKey="primary"
                      description="--primary"
                      hslValue="217, 91%, 60%"
                    />
                    <ColorPicker
                      label="Primary Foreground"
                      colorKey="primaryForeground"
                      description="--primary-foreground"
                      hslValue="0, 0%, 98%"
                    />
                    <ColorPicker
                      label="Secondary"
                      colorKey="secondary"
                      description="--secondary"
                      hslValue="220, 14%, 96%"
                    />
                    <ColorPicker
                      label="Secondary Foreground"
                      colorKey="secondaryForeground"
                      description="--secondary-foreground"
                      hslValue="220, 9%, 46%"
                    />
                  </div>
                </div>

                <Separator />

                {/* Status Colors */}
                <div className="space-y-4">
                  <h4 className="text-sm font-medium">Status Colors</h4>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <ColorPicker
                      label="Success"
                      colorKey="success"
                      description="--success"
                      hslValue="142, 76%, 36%"
                    />
                    <ColorPicker
                      label="Warning"
                      colorKey="warning"
                      description="--warning"
                      hslValue="38, 92%, 50%"
                    />
                    <ColorPicker
                      label="Destructive"
                      colorKey="destructive"
                      description="--destructive"
                      hslValue="0, 84%, 60%"
                    />
                  </div>
                </div>

                <Separator />

                {/* Background Colors */}
                <div className="space-y-4">
                  <h4 className="text-sm font-medium">Background Colors</h4>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <ColorPicker
                      label="Background"
                      colorKey="background"
                      description="--background"
                      hslValue="250, 50%, 98%"
                    />
                    <ColorPicker
                      label="Card"
                      colorKey="card"
                      description="--card"
                      hslValue="0, 0%, 100%"
                    />
                    <ColorPicker
                      label="Muted"
                      colorKey="muted"
                      description="--muted"
                      hslValue="220, 14%, 96%"
                    />
                    <ColorPicker
                      label="Accent"
                      colorKey="accent"
                      description="--accent"
                      hslValue="217, 91%, 95%"
                    />
                  </div>
                </div>

                <Separator />

                {/* Channel Colors */}
                <div className="space-y-4">
                  <h4 className="text-sm font-medium">Channel Colors</h4>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="space-y-2">
                      <div className="h-16 w-full bg-blue-600 rounded-lg border"></div>
                      <div className="text-xs space-y-1">
                        <div className="font-medium">Email</div>
                        <div className="text-muted-foreground">--channel-email</div>
                        <div className="text-muted-foreground">HSL(217, 91%, 60%)</div>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <div className="h-16 w-full bg-blue-800 rounded-lg border"></div>
                      <div className="text-xs space-y-1">
                        <div className="font-medium">Facebook</div>
                        <div className="text-muted-foreground">--channel-facebook</div>
                        <div className="text-muted-foreground">HSL(221, 44%, 41%)</div>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <div className="h-16 w-full bg-pink-600 rounded-lg border"></div>
                      <div className="text-xs space-y-1">
                        <div className="font-medium">Instagram</div>
                        <div className="text-muted-foreground">--channel-instagram</div>
                        <div className="text-muted-foreground">HSL(329, 69%, 56%)</div>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <div className="h-16 w-full bg-green-600 rounded-lg border"></div>
                      <div className="text-xs space-y-1">
                        <div className="font-medium">WhatsApp</div>
                        <div className="text-muted-foreground">--channel-whatsapp</div>
                        <div className="text-muted-foreground">HSL(142, 76%, 36%)</div>
                      </div>
                    </div>
                  </div>
                </div>

                <Separator />

                {/* Text Colors */}
                <div className="space-y-4">
                  <h4 className="text-sm font-medium">Text Colors</h4>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    <ColorPicker
                      label="Foreground"
                      colorKey="foreground"
                      description="--foreground"
                      hslValue="224, 71%, 4%"
                    />
                    <ColorPicker
                      label="Muted Foreground"
                      colorKey="mutedForeground"
                      description="--muted-foreground"
                      hslValue="220, 9%, 46%"
                    />
                    <ColorPicker
                      label="Border"
                      colorKey="border"
                      description="--border"
                      hslValue="220, 13%, 91%"
                    />
                  </div>
                </div>

                <Separator />

                {/* Gradients */}
                <div className="space-y-4">
                  <h4 className="text-sm font-medium">Gradients</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <div className="h-16 w-full bg-gradient-to-r from-blue-500 to-blue-600 rounded-lg border"></div>
                      <div className="text-xs space-y-1">
                        <div className="font-medium">Primary Gradient</div>
                        <div className="text-muted-foreground">--gradient-primary</div>
                        <div className="text-muted-foreground">135deg, HSL(217 91% 60%), HSL(217 91% 55%)</div>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <div className="h-16 w-full bg-gradient-to-r from-gray-50 to-gray-100 rounded-lg border"></div>
                      <div className="text-xs space-y-1">
                        <div className="font-medium">Surface Gradient</div>
                        <div className="text-muted-foreground">--gradient-surface</div>
                        <div className="text-muted-foreground">135deg, HSL(0 0% 100%), HSL(220 14% 98%)</div>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Buttons Section */}
          <TabsContent value="buttons" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Button Variants</CardTitle>
                <CardDescription>
                  All button variants used throughout the application
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex flex-wrap gap-4">
                  <Button variant="default">Default</Button>
                  <Button variant="secondary">Secondary</Button>
                  <Button variant="destructive">Destructive</Button>
                  <Button variant="outline">Outline</Button>
                  <Button variant="ghost">Ghost</Button>
                  <Button variant="link">Link</Button>
                </div>

                <Separator />

                <div className="space-y-2">
                  <h4 className="text-sm font-medium">Button Sizes</h4>
                  <div className="flex flex-wrap items-center gap-4">
                    <Button size="sm">Small</Button>
                    <Button size="default">Default</Button>
                    <Button size="lg">Large</Button>
                    <Button size="icon">
                      <Heart className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                <Separator />

                <div className="space-y-2">
                  <h4 className="text-sm font-medium">Buttons with Icons</h4>
                  <div className="flex flex-wrap gap-4">
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
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Forms Section */}
          <TabsContent value="forms" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Form Elements</CardTitle>
                <CardDescription>
                  Input fields, textareas, and form controls
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input 
                    id="email" 
                    type="email" 
                    placeholder="Enter your email"
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="message">Message</Label>
                  <Textarea 
                    id="message"
                    placeholder="Type your message here..."
                    value={textareaValue}
                    onChange={(e) => setTextareaValue(e.target.value)}
                  />
                </div>

                <div className="flex items-center space-x-2">
                  <Switch 
                    id="notifications"
                    checked={switchValue}
                    onCheckedChange={setSwitchValue}
                  />
                  <Label htmlFor="notifications">Enable notifications</Label>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Cards Section */}
          <TabsContent value="cards" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
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

              <Card className="bg-secondary">
                <CardHeader>
                  <CardTitle>Secondary Card</CardTitle>
                  <CardDescription>A card with secondary background</CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    This card uses the secondary color scheme.
                  </p>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Badges Section */}
          <TabsContent value="badges" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Badge Variants</CardTitle>
                <CardDescription>
                  Different badge styles for status, categories, and labels
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex flex-wrap gap-2">
                  <Badge variant="default">Default</Badge>
                  <Badge variant="secondary">Secondary</Badge>
                  <Badge variant="destructive">Destructive</Badge>
                  <Badge variant="outline">Outline</Badge>
                </div>

                <Separator />

                <div className="space-y-2">
                  <h4 className="text-sm font-medium">Status Badges</h4>
                  <div className="flex flex-wrap gap-2">
                    <Badge className="bg-green-500 hover:bg-green-600">Active</Badge>
                    <Badge className="bg-yellow-500 hover:bg-yellow-600">Pending</Badge>
                    <Badge className="bg-red-500 hover:bg-red-600">Failed</Badge>
                    <Badge className="bg-blue-500 hover:bg-blue-600">Processing</Badge>
                  </div>
                </div>

                <Separator />

                <div className="space-y-2">
                  <h4 className="text-sm font-medium">Priority Badges</h4>
                  <div className="flex flex-wrap gap-2">
                    <Badge variant="outline">Low</Badge>
                    <Badge variant="secondary">Medium</Badge>
                    <Badge variant="default">High</Badge>
                    <Badge variant="destructive">Urgent</Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Feedback Section */}
          <TabsContent value="feedback" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Feedback Components</CardTitle>
                <CardDescription>
                  Alerts, toasts, and status indicators for user feedback
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-2">
                  <h4 className="text-sm font-medium">Toast Notifications</h4>
                  <div className="flex flex-wrap gap-2">
                    <Button onClick={() => showToast('default')}>Show Default Toast</Button>
                    <Button onClick={() => showToast('success')}>Show Success Toast</Button>
                    <Button onClick={() => showToast('error')}>Show Error Toast</Button>
                  </div>
                </div>

                <Separator />

                <div className="space-y-4">
                  <h4 className="text-sm font-medium">Alert Variants</h4>
                  <Alert>
                    <AlertTriangle className="h-4 w-4" />
                    <AlertDescription>
                      This is a default alert with important information.
                    </AlertDescription>
                  </Alert>

                  <Alert className="border-green-200 bg-green-50 text-green-800 dark:border-green-800 dark:bg-green-950 dark:text-green-200">
                    <CheckCircle className="h-4 w-4" />
                    <AlertDescription>
                      This is a success alert indicating a completed action.
                    </AlertDescription>
                  </Alert>

                  <Alert className="border-red-200 bg-red-50 text-red-800 dark:border-red-800 dark:bg-red-950 dark:text-red-200">
                    <XCircle className="h-4 w-4" />
                    <AlertDescription>
                      This is an error alert indicating something went wrong.
                    </AlertDescription>
                  </Alert>
                </div>

                <Separator />

                <div className="space-y-4">
                  <h4 className="text-sm font-medium">Message Error Toast (Used in Conversations)</h4>
                  <div className="space-y-2">
                    <MessageErrorToast>Failed to send email</MessageErrorToast>
                    <div className="flex items-center space-x-2">
                      <Button variant="secondary" size="sm" className="h-7 px-3 text-xs">
                        Try Again
                      </Button>
                      <Button variant="destructive" size="sm" className="h-7 px-3 text-xs">
                        Delete
                      </Button>
                    </div>
                  </div>
                </div>

                <Separator />

                <div className="space-y-2">
                  <h4 className="text-sm font-medium">Status Icons</h4>
                  <div className="flex items-center space-x-4">
                    <div className="flex items-center space-x-2">
                      <CheckCircle className="h-4 w-4 text-green-500" />
                      <span className="text-sm">Sent</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Clock className="h-4 w-4 text-orange-500" />
                      <span className="text-sm">Pending</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <XCircle className="h-4 w-4 text-red-500" />
                      <span className="text-sm">Failed</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Icons Section */}
          <TabsContent value="icons" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Icon Library</CardTitle>
                <CardDescription>
                  Commonly used icons throughout the application
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-2">
                  <h4 className="text-sm font-medium">Navigation Icons</h4>
                  <div className="grid grid-cols-6 gap-4">
                    <div className="flex flex-col items-center space-y-2">
                      <Home className="h-6 w-6" />
                      <span className="text-xs">Home</span>
                    </div>
                    <div className="flex flex-col items-center space-y-2">
                      <MessageSquare className="h-6 w-6" />
                      <span className="text-xs">Messages</span>
                    </div>
                    <div className="flex flex-col items-center space-y-2">
                      <Users className="h-6 w-6" />
                      <span className="text-xs">Users</span>
                    </div>
                    <div className="flex flex-col items-center space-y-2">
                      <BarChart className="h-6 w-6" />
                      <span className="text-xs">Analytics</span>
                    </div>
                    <div className="flex flex-col items-center space-y-2">
                      <Settings className="h-6 w-6" />
                      <span className="text-xs">Settings</span>
                    </div>
                    <div className="flex flex-col items-center space-y-2">
                      <Star className="h-6 w-6" />
                      <span className="text-xs">Favorites</span>
                    </div>
                  </div>
                </div>

                <Separator />

                <div className="space-y-2">
                  <h4 className="text-sm font-medium">Action Icons</h4>
                  <div className="grid grid-cols-6 gap-4">
                    <div className="flex flex-col items-center space-y-2">
                      <Send className="h-6 w-6" />
                      <span className="text-xs">Send</span>
                    </div>
                    <div className="flex flex-col items-center space-y-2">
                      <Heart className="h-6 w-6" />
                      <span className="text-xs">Like</span>
                    </div>
                    <div className="flex flex-col items-center space-y-2">
                      <ThumbsUp className="h-6 w-6" />
                      <span className="text-xs">Approve</span>
                    </div>
                    <div className="flex flex-col items-center space-y-2">
                      <Zap className="h-6 w-6" />
                      <span className="text-xs">Quick</span>
                    </div>
                    <div className="flex flex-col items-center space-y-2">
                      <Clock className="h-6 w-6" />
                      <span className="text-xs">Pending</span>
                    </div>
                    <div className="flex flex-col items-center space-y-2">
                      <AlertTriangle className="h-6 w-6" />
                      <span className="text-xs">Warning</span>
                    </div>
                  </div>
                </div>

                <Separator />

                <div className="space-y-2">
                  <h4 className="text-sm font-medium">Avatars</h4>
                  <div className="flex items-center space-x-4">
                    <Avatar className="h-8 w-8">
                      <AvatarFallback>JD</AvatarFallback>
                    </Avatar>
                    <Avatar className="h-10 w-10">
                      <AvatarFallback>AB</AvatarFallback>
                    </Avatar>
                    <Avatar className="h-12 w-12">
                      <AvatarFallback>CD</AvatarFallback>
                    </Avatar>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default DesignLibrary;