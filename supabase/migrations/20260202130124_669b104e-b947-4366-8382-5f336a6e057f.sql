-- Create knowledge_categories table
CREATE TABLE public.knowledge_categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    color TEXT NOT NULL DEFAULT '#3B82F6',
    description TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    UNIQUE(organization_id, name)
);

-- Create knowledge_tags table
CREATE TABLE public.knowledge_tags (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    color TEXT DEFAULT '#6B7280',
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    UNIQUE(organization_id, name)
);

-- Enable RLS
ALTER TABLE public.knowledge_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.knowledge_tags ENABLE ROW LEVEL SECURITY;

-- RLS Policies for knowledge_categories
CREATE POLICY "Users can view categories in their organization"
ON public.knowledge_categories
FOR SELECT
USING (organization_id = get_user_organization_id());

CREATE POLICY "Admins can insert categories in their organization"
ON public.knowledge_categories
FOR INSERT
WITH CHECK (organization_id = get_user_organization_id() AND has_permission(auth.uid(), 'manage_settings'::app_permission));

CREATE POLICY "Admins can update categories in their organization"
ON public.knowledge_categories
FOR UPDATE
USING (organization_id = get_user_organization_id() AND has_permission(auth.uid(), 'manage_settings'::app_permission));

CREATE POLICY "Admins can delete categories in their organization"
ON public.knowledge_categories
FOR DELETE
USING (organization_id = get_user_organization_id() AND has_permission(auth.uid(), 'manage_settings'::app_permission));

-- RLS Policies for knowledge_tags
CREATE POLICY "Users can view tags in their organization"
ON public.knowledge_tags
FOR SELECT
USING (organization_id = get_user_organization_id());

CREATE POLICY "Admins can insert tags in their organization"
ON public.knowledge_tags
FOR INSERT
WITH CHECK (organization_id = get_user_organization_id() AND has_permission(auth.uid(), 'manage_settings'::app_permission));

CREATE POLICY "Admins can update tags in their organization"
ON public.knowledge_tags
FOR UPDATE
USING (organization_id = get_user_organization_id() AND has_permission(auth.uid(), 'manage_settings'::app_permission));

CREATE POLICY "Admins can delete tags in their organization"
ON public.knowledge_tags
FOR DELETE
USING (organization_id = get_user_organization_id() AND has_permission(auth.uid(), 'manage_settings'::app_permission));

-- Triggers for updated_at
CREATE TRIGGER update_knowledge_categories_updated_at
BEFORE UPDATE ON public.knowledge_categories
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_knowledge_tags_updated_at
BEFORE UPDATE ON public.knowledge_tags
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();