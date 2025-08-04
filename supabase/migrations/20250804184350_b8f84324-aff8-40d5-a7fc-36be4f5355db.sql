-- Create email template settings table
CREATE TABLE public.email_templates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL,
  name TEXT NOT NULL DEFAULT 'Default Template',
  
  -- Header settings
  header_background_color TEXT DEFAULT '#3B82F6',
  header_text_color TEXT DEFAULT '#FFFFFF', 
  header_content TEXT DEFAULT '',
  
  -- Footer settings
  footer_background_color TEXT DEFAULT '#F8F9FA',
  footer_text_color TEXT DEFAULT '#6B7280',
  footer_content TEXT DEFAULT 'Best regards,<br>Support Team',
  
  -- Body settings
  body_background_color TEXT DEFAULT '#FFFFFF',
  body_text_color TEXT DEFAULT '#374151',
  
  -- Signature settings
  signature_content TEXT DEFAULT 'Best regards,<br>{{agent_name}}<br>Support Team',
  include_agent_name BOOLEAN DEFAULT true,
  
  -- Meta
  is_default BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by_id UUID
);

-- Enable RLS
ALTER TABLE public.email_templates ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view templates in their organization" 
ON public.email_templates 
FOR SELECT 
USING (organization_id = public.get_user_organization_id());

CREATE POLICY "Users can create templates in their organization" 
ON public.email_templates 
FOR INSERT 
WITH CHECK (organization_id = public.get_user_organization_id());

CREATE POLICY "Users can update templates in their organization" 
ON public.email_templates 
FOR UPDATE 
USING (organization_id = public.get_user_organization_id());

CREATE POLICY "Users can delete templates in their organization" 
ON public.email_templates 
FOR DELETE 
USING (organization_id = public.get_user_organization_id());

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_email_templates_updated_at
BEFORE UPDATE ON public.email_templates
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();