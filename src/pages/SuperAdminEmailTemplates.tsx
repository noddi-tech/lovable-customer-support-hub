import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { UnifiedAppLayout } from "@/components/layout/UnifiedAppLayout";
import { Mail, AlertCircle, CheckCircle, ExternalLink, Loader2, RotateCcw, Save } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { sanitizeTemplateHTML } from "@/utils/htmlSanitizer";

interface SystemEmailTemplate {
  id?: string;
  template_type: string;
  subject: string;
  html_content: string;
  text_content?: string;
  is_active: boolean;
}

const TEMPLATE_TYPES = [
  {
    type: 'password_reset',
    label: 'Password Reset',
    description: 'Sent when users request to reset their password',
    variables: ['{{ .ConfirmationURL }}', '{{ .Token }}', '{{ .TokenHash }}', '{{ .Email }}']
  },
  {
    type: 'magic_link',
    label: 'Magic Link Sign-In',
    description: 'Sent when users sign in with a magic link',
    variables: ['{{ .ConfirmationURL }}', '{{ .Token }}', '{{ .TokenHash }}', '{{ .Email }}']
  },
  {
    type: 'email_confirmation',
    label: 'Email Confirmation',
    description: 'Sent when new users sign up to confirm their email',
    variables: ['{{ .ConfirmationURL }}', '{{ .Token }}', '{{ .TokenHash }}', '{{ .Email }}']
  },
  {
    type: 'email_change',
    label: 'Email Change Confirmation',
    description: 'Sent when users change their email address',
    variables: ['{{ .ConfirmationURL }}', '{{ .Token }}', '{{ .TokenHash }}', '{{ .Email }}', '{{ .NewEmail }}']
  }
];

export default function SuperAdminEmailTemplates() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState('password_reset');
  const [templates, setTemplates] = useState<Record<string, SystemEmailTemplate>>({});
  const [isSyncing, setIsSyncing] = useState(false);
  const [showSyncConfirm, setShowSyncConfirm] = useState(false);
  const [templateToReset, setTemplateToReset] = useState<string | null>(null);

  // Fetch system email templates
  const { data: systemTemplates, isLoading } = useQuery({
    queryKey: ['system-email-templates'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('system_email_templates')
        .select('*')
        .eq('is_active', true);
      
      if (error) throw error;
      return data as SystemEmailTemplate[];
    }
  });

  // Initialize templates state
  useEffect(() => {
    if (systemTemplates) {
      const templatesMap: Record<string, SystemEmailTemplate> = {};
      systemTemplates.forEach(template => {
        templatesMap[template.template_type] = template;
      });
      setTemplates(templatesMap);
    }
  }, [systemTemplates]);

  // Save template mutation
  const saveTemplateMutation = useMutation({
    mutationFn: async (template: SystemEmailTemplate) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const templatePayload = {
        ...template,
        created_by_id: user.id,
        is_active: true
      };

      if (template.id) {
        const { data, error } = await supabase
          .from('system_email_templates')
          .update(templatePayload)
          .eq('id', template.id)
          .select()
          .single();
        
        if (error) throw error;
        return data;
      } else {
        const { data, error } = await supabase
          .from('system_email_templates')
          .insert(templatePayload)
          .select()
          .single();
        
        if (error) throw error;
        return data;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['system-email-templates'] });
      toast({
        title: "Template saved",
        description: "System email template has been saved successfully.",
      });
    },
    onError: (error) => {
      toast({
        title: "Error saving template",
        description: error.message,
        variant: "destructive",
      });
    }
  });

  // Sync to Supabase Auth
  const handleSyncToSupabase = async () => {
    setShowSyncConfirm(false);
    setIsSyncing(true);
    try {
      const { data, error } = await supabase.functions.invoke('sync-auth-templates', {
        body: {}
      });

      if (error) throw error;

      toast({
        title: "Templates synced successfully",
        description: data.message || `Successfully synced ${data.synced} templates to Supabase Auth.`,
        duration: 5000,
      });
    } catch (error: any) {
      console.error('Sync error:', error);
      toast({
        title: "Sync failed",
        description: error.message || "Failed to sync templates. Please check your secrets configuration.",
        variant: "destructive",
        duration: 7000,
      });
    } finally {
      setIsSyncing(false);
    }
  };

  // Reset template to default
  const handleResetTemplate = async (templateType: string) => {
    setTemplateToReset(null);
    
    // Find the default template from database
    const defaultTemplate = systemTemplates?.find(t => t.template_type === templateType);
    if (defaultTemplate) {
      setTemplates(prev => ({
        ...prev,
        [templateType]: defaultTemplate
      }));
      
      toast({
        title: "Template reset",
        description: "Template has been reset to default values.",
      });
    }
  };

  const handleSaveTemplate = (templateType: string) => {
    const template = templates[templateType];
    
    // Validation
    if (!template || !template.subject || !template.html_content) {
      toast({
        title: "Validation error",
        description: "Subject and HTML content are required.",
        variant: "destructive",
      });
      return;
    }
    
    if (template.subject.length < 3) {
      toast({
        title: "Validation error",
        description: "Subject must be at least 3 characters long.",
        variant: "destructive",
      });
      return;
    }
    
    saveTemplateMutation.mutate(template);
  };

  const updateTemplate = (templateType: string, field: keyof SystemEmailTemplate, value: string | boolean) => {
    setTemplates(prev => ({
      ...prev,
      [templateType]: {
        ...prev[templateType],
        [field]: value
      }
    }));
  };

  const renderTemplateEditor = (templateConfig: typeof TEMPLATE_TYPES[0]) => {
    const template = templates[templateConfig.type] || {
      template_type: templateConfig.type,
      subject: '',
      html_content: '',
      is_active: true
    };

    return (
      <div className="space-y-6">
        {/* Variables Info */}
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            <div className="space-y-2">
              <p className="font-medium">Available template variables:</p>
              <div className="flex flex-wrap gap-2">
                {templateConfig.variables.map(variable => (
                  <code key={variable} className="px-2 py-1 bg-muted rounded text-sm">
                    {variable}
                  </code>
                ))}
              </div>
            </div>
          </AlertDescription>
        </Alert>

        {/* Subject */}
        <div className="space-y-2">
          <Label htmlFor={`subject-${templateConfig.type}`}>Email Subject</Label>
          <Input
            id={`subject-${templateConfig.type}`}
            value={template.subject}
            onChange={(e) => updateTemplate(templateConfig.type, 'subject', e.target.value)}
            placeholder="Enter email subject..."
          />
        </div>

        {/* HTML Content */}
        <div className="space-y-2">
          <Label htmlFor={`html-${templateConfig.type}`}>HTML Content</Label>
          <Textarea
            id={`html-${templateConfig.type}`}
            value={template.html_content}
            onChange={(e) => updateTemplate(templateConfig.type, 'html_content', e.target.value)}
            placeholder="Enter HTML email template..."
            className="min-h-[300px] font-mono text-sm"
          />
        </div>

        {/* Preview */}
        <div className="border rounded-lg p-4 bg-muted/50">
          <h4 className="font-medium mb-3">Preview</h4>
          <div className="border rounded bg-background p-4">
            <div 
              dangerouslySetInnerHTML={{ 
                __html: sanitizeTemplateHTML(
                  template.html_content
                    .replace(/\{\{\s*\.ConfirmationURL\s*\}\}/g, 'https://example.com/confirm?token=sample')
                    .replace(/\{\{\s*\.Email\s*\}\}/g, 'user@example.com')
                    .replace(/\{\{\s*\.NewEmail\s*\}\}/g, 'newemail@example.com')
                    .replace(/\{\{\s*\.Token\s*\}\}/g, 'sample-token')
                    .replace(/\{\{\s*\.TokenHash\s*\}\}/g, 'sample-hash')
                )
              }} 
            />
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3">
          <Button 
            onClick={() => handleSaveTemplate(templateConfig.type)}
            disabled={saveTemplateMutation.isPending || !template.subject || !template.html_content}
            className="flex-1"
          >
            {saveTemplateMutation.isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="mr-2 h-4 w-4" />
                Save Template
              </>
            )}
          </Button>
          <Button 
            onClick={() => setTemplateToReset(templateConfig.type)}
            variant="outline"
            disabled={saveTemplateMutation.isPending}
          >
            <RotateCcw className="mr-2 h-4 w-4" />
            Reset
          </Button>
        </div>
      </div>
    );
  };

  if (isLoading) {
    return (
      <UnifiedAppLayout>
        <div className="flex items-center justify-center h-screen">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </UnifiedAppLayout>
    );
  }

  return (
    <UnifiedAppLayout>
      <div className="container max-w-6xl mx-auto p-6 space-y-6">
        {/* Header */}
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Mail className="h-8 w-8 text-primary" />
            <h1 className="text-3xl font-bold">System Email Templates</h1>
          </div>
          <p className="text-muted-foreground">
            Manage authentication email templates that are sent to all users across the platform.
          </p>
        </div>

        {/* Setup Instructions */}
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            <div className="space-y-2">
              <p className="font-medium">⚠️ First Time Setup Required:</p>
              <ol className="list-decimal list-inside space-y-1 text-sm">
                <li>Go to: <a href="https://supabase.com/dashboard/account/tokens" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline inline-flex items-center gap-1">
                  Supabase Account Tokens <ExternalLink className="h-3 w-3" />
                </a></li>
                <li>Create a new access token with "Full Access" permissions</li>
                <li>Add SUPABASE_ACCESS_TOKEN secret to your project</li>
                <li>Add SUPABASE_PROJECT_REF secret (project reference ID)</li>
                <li>Click "Sync to Supabase" after saving templates</li>
              </ol>
            </div>
          </AlertDescription>
        </Alert>

        {/* Sync Button */}
        <Card>
          <CardHeader>
            <CardTitle>Sync Templates to Supabase Auth</CardTitle>
            <CardDescription>
              After editing templates, click this button to sync them to Supabase Auth configuration.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button 
              onClick={() => setShowSyncConfirm(true)}
              disabled={isSyncing}
              className="w-full"
              size="lg"
            >
              {isSyncing ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Syncing to Supabase Auth...
                </>
              ) : (
                <>
                  <CheckCircle className="mr-2 h-4 w-4" />
                  Sync to Supabase Auth
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        {/* Templates Tabs */}
        <Card>
          <CardHeader>
            <CardTitle>Email Templates</CardTitle>
            <CardDescription>
              Customize the content and design of authentication emails.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="grid grid-cols-4 w-full">
                {TEMPLATE_TYPES.map(config => (
                  <TabsTrigger key={config.type} value={config.type}>
                    {config.label}
                  </TabsTrigger>
                ))}
              </TabsList>
              {TEMPLATE_TYPES.map(config => (
                <TabsContent key={config.type} value={config.type}>
                  <div className="space-y-4">
                    <div>
                      <h3 className="font-medium">{config.label}</h3>
                      <p className="text-sm text-muted-foreground">{config.description}</p>
                    </div>
                    {renderTemplateEditor(config)}
                  </div>
                </TabsContent>
              ))}
            </Tabs>
          </CardContent>
        </Card>

        {/* Sync Confirmation Dialog */}
        <AlertDialog open={showSyncConfirm} onOpenChange={setShowSyncConfirm}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Sync Templates to Supabase Auth?</AlertDialogTitle>
              <AlertDialogDescription>
                This will update the authentication email templates in your Supabase project.
                Make sure you have saved all your changes before syncing.
                <br /><br />
                <strong>Note:</strong> This action requires proper SUPABASE_ACCESS_TOKEN and SUPABASE_PROJECT_REF secrets to be configured.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handleSyncToSupabase}>
                Continue
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Reset Confirmation Dialog */}
        <AlertDialog open={!!templateToReset} onOpenChange={(open) => !open && setTemplateToReset(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Reset Template to Default?</AlertDialogTitle>
              <AlertDialogDescription>
                This will discard any unsaved changes and reset the template to its default values.
                This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={() => templateToReset && handleResetTemplate(templateToReset)}>
                Reset Template
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </UnifiedAppLayout>
  );
}
