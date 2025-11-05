-- Create system_email_templates table
CREATE TABLE IF NOT EXISTS public.system_email_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_type TEXT NOT NULL UNIQUE,
  subject TEXT NOT NULL,
  html_content TEXT NOT NULL,
  text_content TEXT,
  created_by_id UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  is_active BOOLEAN NOT NULL DEFAULT true
);

-- Enable RLS
ALTER TABLE public.system_email_templates ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for system_email_templates
CREATE POLICY "Super admins can view system email templates"
  ON public.system_email_templates
  FOR SELECT
  TO authenticated
  USING (is_super_admin());

CREATE POLICY "Super admins can insert system email templates"
  ON public.system_email_templates
  FOR INSERT
  TO authenticated
  WITH CHECK (is_super_admin());

CREATE POLICY "Super admins can update system email templates"
  ON public.system_email_templates
  FOR UPDATE
  TO authenticated
  USING (is_super_admin())
  WITH CHECK (is_super_admin());

CREATE POLICY "Super admins can delete system email templates"
  ON public.system_email_templates
  FOR DELETE
  TO authenticated
  USING (is_super_admin());

-- Add new columns to email_templates
ALTER TABLE public.email_templates 
ADD COLUMN IF NOT EXISTS template_type TEXT,
ADD COLUMN IF NOT EXISTS scope TEXT DEFAULT 'organization';

-- Update existing rows to have proper values
UPDATE public.email_templates 
SET template_type = 'conversation_reply',
    scope = 'organization'
WHERE template_type IS NULL;

-- Make columns NOT NULL after setting values
ALTER TABLE public.email_templates 
ALTER COLUMN template_type SET NOT NULL,
ALTER COLUMN scope SET NOT NULL;

-- Insert default system email templates
INSERT INTO public.system_email_templates (template_type, subject, html_content, is_active)
VALUES 
  ('confirmation', 'Confirm your email address', '<p>Please click the link below to confirm your email address:</p><p>{{ .ConfirmationURL }}</p>', true),
  ('invite', 'You have been invited', '<p>You have been invited to join our platform.</p><p>Click here to accept: {{ .InviteURL }}</p>', true),
  ('recovery', 'Reset your password', '<p>Click the link below to reset your password:</p><p>{{ .RecoveryURL }}</p>', true),
  ('magic_link', 'Your magic link', '<p>Click the link below to sign in:</p><p>{{ .MagicLinkURL }}</p>', true),
  ('email_change', 'Confirm email change', '<p>Click the link below to confirm your email change:</p><p>{{ .ConfirmationURL }}</p>', true),
  ('reauthentication', 'Confirm it''s you', '<p>Please confirm your identity by clicking the link below:</p><p>{{ .ReauthenticationURL }}</p>', true)
ON CONFLICT (template_type) DO NOTHING;