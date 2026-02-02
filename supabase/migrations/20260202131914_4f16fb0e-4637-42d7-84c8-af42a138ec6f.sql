-- Add category_id column to knowledge_tags table
ALTER TABLE public.knowledge_tags
ADD COLUMN category_id uuid REFERENCES public.knowledge_categories(id) ON DELETE SET NULL;

-- Create index for better query performance
CREATE INDEX idx_knowledge_tags_category_id ON public.knowledge_tags(category_id);

-- Insert default tags for each category

-- Booking & Scheduling tags
INSERT INTO public.knowledge_tags (organization_id, name, color, category_id)
SELECT 
  kc.organization_id,
  tag_name,
  '#10B981',
  kc.id
FROM public.knowledge_categories kc
CROSS JOIN (VALUES ('reschedule'), ('cancellation'), ('availability'), ('time-slot')) AS tags(tag_name)
WHERE kc.name = 'Booking & Scheduling'
ON CONFLICT DO NOTHING;

-- Pricing & Payments tags
INSERT INTO public.knowledge_tags (organization_id, name, color, category_id)
SELECT 
  kc.organization_id,
  tag_name,
  '#8B5CF6',
  kc.id
FROM public.knowledge_categories kc
CROSS JOIN (VALUES ('refund'), ('invoice'), ('discount'), ('payment-failed')) AS tags(tag_name)
WHERE kc.name = 'Pricing & Payments'
ON CONFLICT DO NOTHING;

-- Service Delivery tags
INSERT INTO public.knowledge_tags (organization_id, name, color, category_id)
SELECT 
  kc.organization_id,
  tag_name,
  '#3B82F6',
  kc.id
FROM public.knowledge_categories kc
CROSS JOIN (VALUES ('delayed'), ('completed'), ('quality-issue'), ('no-show')) AS tags(tag_name)
WHERE kc.name = 'Service Delivery'
ON CONFLICT DO NOTHING;

-- Service Locations tags
INSERT INTO public.knowledge_tags (organization_id, name, color, category_id)
SELECT 
  kc.organization_id,
  tag_name,
  '#F59E0B',
  kc.id
FROM public.knowledge_categories kc
CROSS JOIN (VALUES ('coverage'), ('travel-fee'), ('new-area')) AS tags(tag_name)
WHERE kc.name = 'Service Locations'
ON CONFLICT DO NOTHING;

-- Technical Issues tags
INSERT INTO public.knowledge_tags (organization_id, name, color, category_id)
SELECT 
  kc.organization_id,
  tag_name,
  '#14B8A6',
  kc.id
FROM public.knowledge_categories kc
CROSS JOIN (VALUES ('app-crash'), ('login-problem'), ('notification')) AS tags(tag_name)
WHERE kc.name = 'Technical Issues'
ON CONFLICT DO NOTHING;

-- Account Management tags
INSERT INTO public.knowledge_tags (organization_id, name, color, category_id)
SELECT 
  kc.organization_id,
  tag_name,
  '#EC4899',
  kc.id
FROM public.knowledge_categories kc
CROSS JOIN (VALUES ('password-reset'), ('profile-update'), ('subscription')) AS tags(tag_name)
WHERE kc.name = 'Account Management'
ON CONFLICT DO NOTHING;

-- Service Providers tags
INSERT INTO public.knowledge_tags (organization_id, name, color, category_id)
SELECT 
  kc.organization_id,
  tag_name,
  '#6B7280',
  kc.id
FROM public.knowledge_categories kc
CROSS JOIN (VALUES ('rating'), ('certification'), ('response-time')) AS tags(tag_name)
WHERE kc.name = 'Service Providers'
ON CONFLICT DO NOTHING;

-- Global tags (no category_id - applies to all categories)
INSERT INTO public.knowledge_tags (organization_id, name, color, category_id)
SELECT DISTINCT
  kc.organization_id,
  tag_name,
  '#6B7280',
  NULL::uuid
FROM public.knowledge_categories kc
CROSS JOIN (VALUES ('urgent'), ('follow-up'), ('escalation'), ('how-to')) AS tags(tag_name)
ON CONFLICT DO NOTHING;