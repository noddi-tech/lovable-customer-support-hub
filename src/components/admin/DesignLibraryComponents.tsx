import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Progress } from '@/components/ui/progress';
import { Slider } from '@/components/ui/slider';
import { Checkbox } from '@/components/ui/checkbox';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { 
  Bell,
  Home,
  Search,
  Plus,
  Edit,
  Eye,
  Download,
  Upload,
  Check,
  X,
  AlertTriangle,
  Info,
  HelpCircle,
  User,
  Mail
} from 'lucide-react';

interface DesignLibraryComponentsProps {
  demoInputValue: string;
  setDemoInputValue: (value: string) => void;
  demoTextareaValue: string;
  setDemoTextareaValue: (value: string) => void;
  demoSwitchValue: boolean;
  setDemoSwitchValue: (value: boolean) => void;
  demoSelectValue: string;
  setDemoSelectValue: (value: string) => void;
  demoSliderValue: number[];
  setDemoSliderValue: (value: number[]) => void;
  demoCheckboxValue: boolean;
  setDemoCheckboxValue: (value: boolean) => void;
  demoRadioValue: string;
  setDemoRadioValue: (value: string) => void;
  demoProgress: number;
  showDemoToast: (type: 'default' | 'success' | 'destructive') => void;
}

export const DesignLibraryComponents: React.FC<DesignLibraryComponentsProps> = ({
  demoInputValue,
  setDemoInputValue,
  demoTextareaValue,
  setDemoTextareaValue,
  demoSwitchValue,
  setDemoSwitchValue,
  demoSelectValue,
  setDemoSelectValue,
  demoSliderValue,
  setDemoSliderValue,
  demoCheckboxValue,
  setDemoCheckboxValue,
  demoRadioValue,
  setDemoRadioValue,
  demoProgress,
  showDemoToast
}) => {
  return (
    <div className="space-y-8">
      {/* Form Components Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Edit className="w-5 h-5" />
            Form Components
          </CardTitle>
          <CardDescription>
            Interactive form elements and inputs
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="space-y-4">
              <h4 className="text-sm font-medium">Input Fields</h4>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="demo-input">Email Address</Label>
                  <Input 
                    id="demo-input"
                    type="email" 
                    placeholder="Enter your email"
                    value={demoInputValue}
                    onChange={(e) => setDemoInputValue(e.target.value)}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="demo-input-disabled">Disabled Input</Label>
                  <Input 
                    id="demo-input-disabled"
                    type="text" 
                    placeholder="This input is disabled"
                    disabled
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="demo-input-error">Input with Error</Label>
                  <Input 
                    id="demo-input-error"
                    type="text" 
                    placeholder="This has an error"
                    className="border-destructive focus-visible:ring-destructive"
                  />
                  <p className="text-sm text-destructive">This field is required</p>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <h4 className="text-sm font-medium">Advanced Inputs</h4>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="demo-textarea">Description</Label>
                  <Textarea 
                    id="demo-textarea"
                    placeholder="Type your message here..."
                    value={demoTextareaValue}
                    onChange={(e) => setDemoTextareaValue(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="demo-select">Select Option</Label>
                  <Select value={demoSelectValue} onValueChange={setDemoSelectValue}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select an option" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="option1">Option 1</SelectItem>
                      <SelectItem value="option2">Option 2</SelectItem>
                      <SelectItem value="option3">Option 3</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          </div>

          <Separator />

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="space-y-4">
              <h4 className="text-sm font-medium">Toggle Controls</h4>
              <div className="space-y-4">
                <div className="flex items-center space-x-2">
                  <Switch 
                    id="demo-switch"
                    checked={demoSwitchValue}
                    onCheckedChange={setDemoSwitchValue}
                  />
                  <Label htmlFor="demo-switch">Enable notifications</Label>
                </div>

                <div className="flex items-center space-x-2">
                  <Checkbox 
                    id="demo-checkbox"
                    checked={demoCheckboxValue}
                    onCheckedChange={setDemoCheckboxValue}
                  />
                  <Label htmlFor="demo-checkbox">I agree to the terms and conditions</Label>
                </div>

                <div className="space-y-2">
                  <Label>Choose an option</Label>
                  <RadioGroup value={demoRadioValue} onValueChange={setDemoRadioValue}>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="option1" id="radio1" />
                      <Label htmlFor="radio1">Option 1</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="option2" id="radio2" />
                      <Label htmlFor="radio2">Option 2</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="option3" id="radio3" />
                      <Label htmlFor="radio3">Option 3</Label>
                    </div>
                  </RadioGroup>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <h4 className="text-sm font-medium">Range Controls</h4>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Volume: {demoSliderValue[0]}%</Label>
                  <Slider
                    value={demoSliderValue}
                    onValueChange={setDemoSliderValue}
                    max={100}
                    step={1}
                    className="w-full"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Progress: {demoProgress}%</Label>
                  <Progress value={demoProgress} className="w-full" />
                  <div className="flex gap-2">
                    <Button size="sm" onClick={() => Math.max(0, demoProgress - 10)}>
                      Decrease
                    </Button>
                    <Button size="sm" onClick={() => Math.min(100, demoProgress + 10)}>
                      Increase
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Alerts and Feedback Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="w-5 h-5" />
            Alerts & Feedback
          </CardTitle>
          <CardDescription>
            System messages, notifications, and user feedback components
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-4">
            <h4 className="text-sm font-medium">Alert Variants</h4>
            <div className="space-y-4">
              <Alert>
                <Info className="h-4 w-4" />
                <AlertTitle>Information</AlertTitle>
                <AlertDescription>
                  This is an informational alert with some helpful information.
                </AlertDescription>
              </Alert>

              <Alert 
                className="border-warning bg-warning"
                style={{ 
                  backgroundColor: 'hsl(var(--warning) / 0.1)',
                  borderColor: 'hsl(var(--warning))',
                  color: 'hsl(var(--foreground))'
                }}
              >
                <AlertTriangle className="h-4 w-4" style={{ color: 'hsl(var(--warning))' }} />
                <AlertTitle style={{ color: 'hsl(0 0% 0%)' }}>Warning</AlertTitle>
                <AlertDescription style={{ color: 'hsl(0 0% 0%)' }}>
                  This is a warning alert. Please pay attention to this message.
                </AlertDescription>
              </Alert>

              <Alert variant="destructive">
                <X className="h-4 w-4" />
                <AlertTitle>Error</AlertTitle>
                <AlertDescription>
                  This is an error alert. Something went wrong and needs attention.
                </AlertDescription>
              </Alert>

              <Alert 
                className="border-success bg-success"
                style={{ 
                  backgroundColor: 'hsl(var(--success))',
                  borderColor: 'hsl(var(--success))',
                  color: 'hsl(var(--success-foreground))'
                }}
              >
                <Check className="h-4 w-4" style={{ color: 'white' }} />
                <AlertTitle style={{ color: 'white' }}>Success</AlertTitle>
                <AlertDescription style={{ color: 'white' }}>
                  This is a success alert. The operation completed successfully.
                </AlertDescription>
              </Alert>
            </div>
          </div>

          <Separator />

          <div className="space-y-4">
            <h4 className="text-sm font-medium">Toast Messages</h4>
            <div className="flex flex-wrap gap-3">
              <Button 
                variant="outline" 
                onClick={() => showDemoToast('default')}
              >
                Show Default Toast
              </Button>
              <Button 
                variant="outline" 
                onClick={() => showDemoToast('success')}
              >
                Show Success Toast
              </Button>
              <Button 
                variant="outline" 
                onClick={() => showDemoToast('destructive')}
              >
                Show Error Toast
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Avatar and User Components */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="w-5 h-5" />
            Avatars & User Components
          </CardTitle>
          <CardDescription>
            User representation and profile components
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-4">
            <h4 className="text-sm font-medium">Avatar Sizes</h4>
            <div className="flex items-center gap-4">
              <Avatar className="h-8 w-8">
                <AvatarFallback className="text-xs">SM</AvatarFallback>
              </Avatar>
              <Avatar className="h-10 w-10">
                <AvatarFallback>MD</AvatarFallback>
              </Avatar>
              <Avatar className="h-12 w-12">
                <AvatarFallback>LG</AvatarFallback>
              </Avatar>
              <Avatar className="h-16 w-16">
                <AvatarFallback>XL</AvatarFallback>
              </Avatar>
            </div>
          </div>

          <Separator />

          <div className="space-y-4">
            <h4 className="text-sm font-medium">User Cards</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center space-x-4">
                    <Avatar>
                      <AvatarFallback>JD</AvatarFallback>
                    </Avatar>
                    <div className="space-y-1">
                      <h4 className="text-sm font-semibold">John Doe</h4>
                      <p className="text-sm text-muted-foreground">john@example.com</p>
                      <Badge variant="secondary">Admin</Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center space-x-4">
                    <Avatar>
                      <AvatarFallback>SA</AvatarFallback>
                    </Avatar>
                    <div className="space-y-1">
                      <h4 className="text-sm font-semibold">Sarah Anderson</h4>
                      <p className="text-sm text-muted-foreground">sarah@example.com</p>
                      <Badge variant="outline">User</Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Navigation and Actions */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Home className="w-5 h-5" />
            Navigation & Actions
          </CardTitle>
          <CardDescription>
            Navigation elements and action buttons
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-4">
            <h4 className="text-sm font-medium">Action Buttons</h4>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <Button variant="outline" className="justify-start">
                <Plus className="h-4 w-4 mr-2" />
                Create
              </Button>
              <Button variant="outline" className="justify-start">
                <Edit className="h-4 w-4 mr-2" />
                Edit
              </Button>
              <Button variant="outline" className="justify-start">
                <Eye className="h-4 w-4 mr-2" />
                View
              </Button>
              <Button variant="outline" className="justify-start">
                <Download className="h-4 w-4 mr-2" />
                Download
              </Button>
              <Button variant="outline" className="justify-start">
                <Upload className="h-4 w-4 mr-2" />
                Upload
              </Button>
              <Button variant="outline" className="justify-start">
                <Search className="h-4 w-4 mr-2" />
                Search
              </Button>
              <Button variant="outline" className="justify-start">
                <Mail className="h-4 w-4 mr-2" />
                Email
              </Button>
              <Button variant="outline" className="justify-start">
                <HelpCircle className="h-4 w-4 mr-2" />
                Help
              </Button>
            </div>
          </div>

          <Separator />

          <div className="space-y-4">
            <h4 className="text-sm font-medium">Button Groups</h4>
            <div className="flex gap-1 border rounded-md p-1 w-fit">
              <Button variant="ghost" size="sm">Left</Button>
              <Button variant="ghost" size="sm">Center</Button>
              <Button variant="ghost" size="sm">Right</Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default DesignLibraryComponents;