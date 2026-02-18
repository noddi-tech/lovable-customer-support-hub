
-- Add inbox_id column to email_templates for per-inbox templates
ALTER TABLE public.email_templates
  ADD COLUMN inbox_id uuid REFERENCES public.inboxes(id) ON DELETE SET NULL;

-- Add index for faster lookups
CREATE INDEX idx_email_templates_inbox_id ON public.email_templates(inbox_id);

-- Add unique constraint: one template per (org, template_type, inbox_id) combo
-- This allows one org-default (inbox_id=NULL) + one per inbox
CREATE UNIQUE INDEX idx_email_templates_org_type_inbox 
  ON public.email_templates(organization_id, template_type, inbox_id) 
  WHERE inbox_id IS NOT NULL;

CREATE UNIQUE INDEX idx_email_templates_org_type_default 
  ON public.email_templates(organization_id, template_type) 
  WHERE inbox_id IS NULL AND is_default = true;
