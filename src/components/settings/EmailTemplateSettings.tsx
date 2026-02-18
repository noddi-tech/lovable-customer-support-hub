import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { sanitizeTemplateHTML } from "@/utils/htmlSanitizer";

interface EmailTemplate {
  id?: string;
  name: string;
  header_background_color: string;
  header_text_color: string;
  header_content: string;
  footer_background_color: string;
  footer_text_color: string;
  footer_content: string;
  body_background_color: string;
  body_text_color: string;
  signature_content: string;
  include_agent_name: boolean;
  inbox_id?: string | null;
}

const defaultTemplate: EmailTemplate = {
  name: 'Default Template',
  header_background_color: '#3B82F6',
  header_text_color: '#FFFFFF',
  header_content: '',
  footer_background_color: '#F8F9FA',
  footer_text_color: '#6B7280',
  footer_content: 'Best regards,<br>Support Team',
  body_background_color: '#FFFFFF',
  body_text_color: '#374151',
  signature_content: 'Best regards,<br>{{agent_name}}<br>Support Team',
  include_agent_name: true,
};

export function EmailTemplateSettings() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { t } = useTranslation();
  const [activeTemplateType, setActiveTemplateType] = useState('conversation_reply');
  // "default" means org-wide (inbox_id IS NULL), otherwise an inbox UUID
  const [selectedInboxId, setSelectedInboxId] = useState<string>('default');
  
  const [template, setTemplate] = useState<EmailTemplate>({ ...defaultTemplate });

  // Fetch inboxes for the inbox selector
  const { data: inboxes } = useQuery({
    queryKey: ['inboxes-for-templates'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('inboxes')
        .select('id, name, is_active')
        .eq('is_active', true)
        .order('name');
      if (error) throw error;
      return data || [];
    }
  });

  // Fetch existing template for active type + selected inbox
  const { data: existingTemplate } = useQuery({
    queryKey: ['email-template', activeTemplateType, selectedInboxId],
    queryFn: async () => {
      let query = supabase
        .from('email_templates')
        .select('*')
        .eq('template_type', activeTemplateType);

      if (activeTemplateType === 'conversation_reply' && selectedInboxId !== 'default') {
        query = query.eq('inbox_id', selectedInboxId);
      } else {
        query = query.is('inbox_id', null).eq('is_default', true);
      }

      const { data, error } = await query.maybeSingle();
      
      if (error) throw error;
      return data;
    }
  });

  // Update template state when data is loaded or inbox changes
  useEffect(() => {
    if (existingTemplate) {
      setTemplate(existingTemplate);
    } else {
      setTemplate({ ...defaultTemplate, inbox_id: selectedInboxId === 'default' ? null : selectedInboxId });
    }
  }, [existingTemplate, selectedInboxId]);

  // Reset inbox selector when switching away from conversation_reply
  useEffect(() => {
    if (activeTemplateType !== 'conversation_reply') {
      setSelectedInboxId('default');
    }
  }, [activeTemplateType]);

  // Save template mutation
  const saveTemplateMutation = useMutation({
    mutationFn: async (templateData: EmailTemplate) => {
      const { data: profile } = await supabase.auth.getUser();
      if (!profile.user) throw new Error('Not authenticated');

      const { data: userProfile } = await supabase
        .from('profiles')
        .select('organization_id')
        .eq('user_id', profile.user.id)
        .single();

      if (!userProfile) throw new Error('User profile not found');

      const inboxId = activeTemplateType === 'conversation_reply' && selectedInboxId !== 'default'
        ? selectedInboxId
        : null;

      const templatePayload = {
        ...templateData,
        organization_id: userProfile.organization_id,
        created_by_id: profile.user.id,
        is_default: inboxId === null,
        template_type: activeTemplateType,
        scope: 'organization',
        inbox_id: inboxId,
      };

      // Remove id from payload for insert
      const { id, ...payloadWithoutId } = templatePayload;

      if (existingTemplate?.id) {
        const { data, error } = await supabase
          .from('email_templates')
          .update(payloadWithoutId)
          .eq('id', existingTemplate.id)
          .select()
          .single();
        
        if (error) throw error;
        return data;
      } else {
        const { data, error } = await supabase
          .from('email_templates')
          .insert(payloadWithoutId)
          .select()
          .single();
        
        if (error) throw error;
        return data;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['email-template'] });
      toast({
        title: "Email template saved",
        description: "Your email template has been updated successfully.",
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

  const handleSave = () => {
    saveTemplateMutation.mutate(template);
  };

  const updateTemplate = (field: keyof EmailTemplate, value: string | boolean) => {
    setTemplate(prev => ({ ...prev, [field]: value }));
  };

  const templateTypeInfo = {
    conversation_reply: {
      title: 'Conversation Reply Template',
      description: 'Template used when agents reply to customer conversations',
      variables: ['{{agent_name}}']
    },
    organization_invite: {
      title: 'Organization Invite Template',
      description: 'Template used when inviting users to your organization',
      variables: ['{{organization_name}}', '{{invite_link}}', '{{role}}', '{{inviter_name}}']
    },
    welcome: {
      title: 'Welcome Email Template',
      description: 'Template sent to new users when they join your organization',
      variables: ['{{organization_name}}', '{{user_name}}']
    }
  };

  const currentTemplateInfo = templateTypeInfo[activeTemplateType as keyof typeof templateTypeInfo];

  return (
    <div className="space-y-6">
      <Card className="bg-gradient-surface border-border/50 shadow-surface">
        <CardHeader>
          <CardTitle className="text-primary">Organization Email Templates</CardTitle>
          <CardDescription>
            Customize email templates for your organization's communications
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Template Type Tabs */}
          <Tabs value={activeTemplateType} onValueChange={setActiveTemplateType}>
            <TabsList className="grid grid-cols-3 w-full">
              <TabsTrigger value="conversation_reply">Conversation Reply</TabsTrigger>
              <TabsTrigger value="organization_invite">Invite User</TabsTrigger>
              <TabsTrigger value="welcome">Welcome Email</TabsTrigger>
            </TabsList>
            <TabsContent value={activeTemplateType} className="space-y-6 mt-6">
              {/* Template Info */}
              <div className="border-l-4 border-primary pl-4">
                <h4 className="font-medium">{currentTemplateInfo.title}</h4>
                <p className="text-sm text-muted-foreground">{currentTemplateInfo.description}</p>
                <div className="flex flex-wrap gap-2 mt-2">
                  {currentTemplateInfo.variables.map(variable => (
                    <code key={variable} className="px-2 py-1 bg-muted rounded text-xs">
                      {variable}
                    </code>
                  ))}
                </div>
              </div>

              {/* Inbox Selector - only for conversation_reply */}
              {activeTemplateType === 'conversation_reply' && inboxes && inboxes.length > 0 && (
                <div className="space-y-2">
                  <Label>Inbox</Label>
                  <Select value={selectedInboxId} onValueChange={setSelectedInboxId}>
                    <SelectTrigger className="w-full max-w-xs">
                      <SelectValue placeholder="Select inbox" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="default">Organization Default</SelectItem>
                      {inboxes.map(inbox => (
                        <SelectItem key={inbox.id} value={inbox.id}>
                          {inbox.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-sm text-muted-foreground">
                    {selectedInboxId === 'default'
                      ? 'This template is used for inboxes without a specific template.'
                      : 'This template overrides the organization default for this inbox.'}
                  </p>
                </div>
              )}

          {/* Preview */}
          <div className="border rounded-lg p-4 bg-muted/50">
            <h4 className="font-medium mb-3">{t('emailTemplate.preview')}</h4>
            <div className="border rounded bg-background max-w-md mx-auto">
              {template.header_content && (
                <div 
                  style={{ 
                    backgroundColor: template.header_background_color,
                    color: template.header_text_color,
                    padding: '16px',
                    textAlign: 'center'
                  }}
                  dangerouslySetInnerHTML={{ __html: sanitizeTemplateHTML(template.header_content) }}
                />
              )}
              <div 
                style={{ 
                  backgroundColor: template.body_background_color,
                  color: template.body_text_color,
                  padding: '24px'
                }}
              >
                <div style={{ lineHeight: '1.6' }}>
                  {t('emailTemplate.yourReply')}
                </div>
                {template.signature_content && (
                  <div style={{ marginTop: '16px', paddingTop: '16px', borderTop: '1px solid #E5E7EB' }}>
                    <div dangerouslySetInnerHTML={{ 
                      __html: sanitizeTemplateHTML(
                        template.signature_content.replace('{{agent_name}}', template.include_agent_name ? 'Your Name' : 'Support Team')
                      )
                    }} />
                  </div>
                )}
              </div>
              {template.footer_content && (
                <div 
                  style={{ 
                    backgroundColor: template.footer_background_color,
                    color: template.footer_text_color,
                    padding: '16px',
                    textAlign: 'center',
                    fontSize: '12px'
                  }}
                  dangerouslySetInnerHTML={{ __html: sanitizeTemplateHTML(template.footer_content) }}
                />
              )}
            </div>
          </div>

          {/* Header Settings */}
          <div className="space-y-4">
            <h4 className="font-medium">{t('emailTemplate.header')}</h4>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="header-bg">{t('emailTemplate.backgroundColor')}</Label>
                <Input
                  id="header-bg"
                  type="color"
                  value={template.header_background_color}
                  onChange={(e) => updateTemplate('header_background_color', e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="header-text">{t('emailTemplate.textColor')}</Label>
                <Input
                  id="header-text"
                  type="color"
                  value={template.header_text_color}
                  onChange={(e) => updateTemplate('header_text_color', e.target.value)}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="header-content">{t('emailTemplate.headerContent')}</Label>
              <Textarea
                id="header-content"
                placeholder={t('emailTemplate.leaveEmpty')}
                value={template.header_content}
                onChange={(e) => updateTemplate('header_content', e.target.value)}
              />
            </div>
          </div>

          {/* Body Settings */}
          <div className="space-y-4">
            <h4 className="font-medium">{t('emailTemplate.body')}</h4>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="body-bg">Background Color</Label>
                <Input
                  id="body-bg"
                  type="color"
                  value={template.body_background_color}
                  onChange={(e) => updateTemplate('body_background_color', e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="body-text">Text Color</Label>
                <Input
                  id="body-text"
                  type="color"
                  value={template.body_text_color}
                  onChange={(e) => updateTemplate('body_text_color', e.target.value)}
                />
              </div>
            </div>
          </div>

          {/* Signature Settings */}
          <div className="space-y-4">
            <h4 className="font-medium">{t('emailTemplate.signature')}</h4>
            <div className="flex items-center space-x-2">
              <Switch
                id="include-agent"
                checked={template.include_agent_name}
                onCheckedChange={(checked) => updateTemplate('include_agent_name', checked)}
              />
              <Label htmlFor="include-agent">{t('emailTemplate.includeAgentName')}</Label>
            </div>
            <div className="space-y-2">
              <Label htmlFor="signature">{t('emailTemplate.signatureContent')}</Label>
              <Textarea
                id="signature"
                placeholder={t('emailTemplate.useAgentName')}
                value={template.signature_content}
                onChange={(e) => updateTemplate('signature_content', e.target.value)}
              />
              <p className="text-sm text-muted-foreground">
                {t('emailTemplate.automaticallyInsert')}
              </p>
            </div>
          </div>

          {/* Footer Settings */}
          <div className="space-y-4">
            <h4 className="font-medium">{t('emailTemplate.footer')}</h4>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="footer-bg">Background Color</Label>
                <Input
                  id="footer-bg"
                  type="color"
                  value={template.footer_background_color}
                  onChange={(e) => updateTemplate('footer_background_color', e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="footer-text">Text Color</Label>
                <Input
                  id="footer-text"
                  type="color"
                  value={template.footer_text_color}
                  onChange={(e) => updateTemplate('footer_text_color', e.target.value)}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="footer-content">{t('emailTemplate.footerContent')}</Label>
              <Textarea
                id="footer-content"
                placeholder={t('emailTemplate.leaveEmptyFooter')}
                value={template.footer_content}
                onChange={(e) => updateTemplate('footer_content', e.target.value)}
              />
            </div>
          </div>

              <Button 
                onClick={handleSave} 
                disabled={saveTemplateMutation.isPending}
                className="w-full bg-gradient-primary hover:bg-primary-hover text-primary-foreground shadow-glow"
              >
                {saveTemplateMutation.isPending ? t('admin.saving') : t('emailTemplate.saveTemplate')}
              </Button>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
