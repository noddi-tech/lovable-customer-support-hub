CREATE TYPE public.taggable_entity AS ENUM ('conversation', 'call', 'case', 'customer');

CREATE TABLE public.tags (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  color TEXT NOT NULL DEFAULT '#6366f1',
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX tags_org_name_unique ON public.tags (organization_id, lower(name));

GRANT SELECT, INSERT, UPDATE, DELETE ON public.tags TO authenticated;
GRANT ALL ON public.tags TO service_role;

ALTER TABLE public.tags ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members can view tags" ON public.tags
FOR SELECT TO authenticated
USING (organization_id = public.get_user_organization_id());

CREATE POLICY "Org members can create tags" ON public.tags
FOR INSERT TO authenticated
WITH CHECK (organization_id = public.get_user_organization_id());

CREATE POLICY "Admins can update tags" ON public.tags
FOR UPDATE TO authenticated
USING (organization_id = public.get_user_organization_id()
  AND (public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'super_admin'::app_role)))
WITH CHECK (organization_id = public.get_user_organization_id());

CREATE POLICY "Admins can delete tags" ON public.tags
FOR DELETE TO authenticated
USING (organization_id = public.get_user_organization_id()
  AND (public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'super_admin'::app_role)));

CREATE TABLE public.tag_links (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tag_id UUID NOT NULL REFERENCES public.tags(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  entity_type public.taggable_entity NOT NULL,
  entity_id UUID NOT NULL,
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX tag_links_unique ON public.tag_links (tag_id, entity_type, entity_id);
CREATE INDEX tag_links_entity_idx ON public.tag_links (entity_type, entity_id);
CREATE INDEX tag_links_org_tag_idx ON public.tag_links (organization_id, tag_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.tag_links TO authenticated;
GRANT ALL ON public.tag_links TO service_role;

ALTER TABLE public.tag_links ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members can view tag links" ON public.tag_links
FOR SELECT TO authenticated
USING (organization_id = public.get_user_organization_id());

CREATE POLICY "Org members can create tag links" ON public.tag_links
FOR INSERT TO authenticated
WITH CHECK (organization_id = public.get_user_organization_id());

CREATE POLICY "Org members can delete tag links" ON public.tag_links
FOR DELETE TO authenticated
USING (organization_id = public.get_user_organization_id());

CREATE TRIGGER update_tags_updated_at
BEFORE UPDATE ON public.tags
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();