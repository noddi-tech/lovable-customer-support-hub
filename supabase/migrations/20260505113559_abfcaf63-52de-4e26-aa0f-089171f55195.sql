
CREATE TABLE public.recruitment_tags (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name text NOT NULL CHECK (char_length(name) BETWEEN 1 AND 50),
  color text NOT NULL DEFAULT '#6B7280' CHECK (color ~* '^#[0-9A-Fa-f]{6}$'),
  description text,
  display_order integer NOT NULL DEFAULT 0,
  archived_at timestamptz,
  created_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX recruitment_tags_org_name_unique
  ON public.recruitment_tags (organization_id, lower(name));
CREATE INDEX recruitment_tags_org_visible_idx
  ON public.recruitment_tags (organization_id, archived_at, display_order);

ALTER TABLE public.recruitment_tags ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members can view tags"
  ON public.recruitment_tags FOR SELECT
  USING (public.is_org_member(organization_id));

CREATE POLICY "Org admins can create tags"
  ON public.recruitment_tags FOR INSERT
  WITH CHECK (
    public.is_org_admin(organization_id)
    OR public.has_role(auth.uid(), 'super_admin'::app_role)
  );

CREATE POLICY "Org admins can update tags"
  ON public.recruitment_tags FOR UPDATE
  USING (
    public.is_org_admin(organization_id)
    OR public.has_role(auth.uid(), 'super_admin'::app_role)
  )
  WITH CHECK (
    public.is_org_admin(organization_id)
    OR public.has_role(auth.uid(), 'super_admin'::app_role)
  );

CREATE TRIGGER recruitment_tags_set_updated_at
  BEFORE UPDATE ON public.recruitment_tags
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.recruitment_applicant_tags (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  applicant_id uuid NOT NULL REFERENCES public.applicants(id) ON DELETE CASCADE,
  tag_id uuid NOT NULL REFERENCES public.recruitment_tags(id) ON DELETE CASCADE,
  organization_id uuid NOT NULL,
  added_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  added_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (applicant_id, tag_id)
);

CREATE INDEX recruitment_applicant_tags_applicant_idx
  ON public.recruitment_applicant_tags (applicant_id);
CREATE INDEX recruitment_applicant_tags_tag_idx
  ON public.recruitment_applicant_tags (tag_id);
CREATE INDEX recruitment_applicant_tags_org_idx
  ON public.recruitment_applicant_tags (organization_id);

ALTER TABLE public.recruitment_applicant_tags ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members can view applicant tags"
  ON public.recruitment_applicant_tags FOR SELECT
  USING (public.is_org_member(organization_id));

CREATE POLICY "Org members can attach applicant tags"
  ON public.recruitment_applicant_tags FOR INSERT
  WITH CHECK (public.is_org_member(organization_id));

CREATE POLICY "Org members can remove applicant tags"
  ON public.recruitment_applicant_tags FOR DELETE
  USING (public.is_org_member(organization_id));

CREATE OR REPLACE FUNCTION public.recruitment_applicant_tag_set_org()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_applicant_org uuid;
  v_tag_org uuid;
BEGIN
  SELECT organization_id INTO v_applicant_org FROM public.applicants WHERE id = NEW.applicant_id;
  IF v_applicant_org IS NULL THEN
    RAISE EXCEPTION 'Applicant % not found', NEW.applicant_id;
  END IF;
  SELECT organization_id INTO v_tag_org FROM public.recruitment_tags WHERE id = NEW.tag_id;
  IF v_tag_org IS NULL THEN
    RAISE EXCEPTION 'Tag % not found', NEW.tag_id;
  END IF;
  IF v_applicant_org <> v_tag_org THEN
    RAISE EXCEPTION 'Tag and applicant belong to different organizations';
  END IF;
  NEW.organization_id := v_applicant_org;
  RETURN NEW;
END;
$$;

CREATE TRIGGER recruitment_applicant_tags_set_org
  BEFORE INSERT ON public.recruitment_applicant_tags
  FOR EACH ROW EXECUTE FUNCTION public.recruitment_applicant_tag_set_org();

CREATE OR REPLACE FUNCTION public.recruitment_applicant_tag_audit()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_tag_name text;
  v_tag_color text;
BEGIN
  IF TG_OP = 'INSERT' THEN
    SELECT name, color INTO v_tag_name, v_tag_color
      FROM public.recruitment_tags WHERE id = NEW.tag_id;
    INSERT INTO public.recruitment_audit_events (
      organization_id, event_type, event_category,
      subject_table, subject_id, applicant_id,
      actor_profile_id, new_values
    ) VALUES (
      NEW.organization_id, 'tag_added', 'applicant',
      'applicants', NEW.applicant_id, NEW.applicant_id,
      NEW.added_by,
      jsonb_build_object('tag_id', NEW.tag_id, 'name', v_tag_name, 'color', v_tag_color)
    );
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    SELECT name, color INTO v_tag_name, v_tag_color
      FROM public.recruitment_tags WHERE id = OLD.tag_id;
    INSERT INTO public.recruitment_audit_events (
      organization_id, event_type, event_category,
      subject_table, subject_id, applicant_id,
      actor_profile_id, old_values
    ) VALUES (
      OLD.organization_id, 'tag_removed', 'applicant',
      'applicants', OLD.applicant_id, OLD.applicant_id,
      NULL,
      jsonb_build_object('tag_id', OLD.tag_id, 'name', v_tag_name, 'color', v_tag_color)
    );
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$;

CREATE TRIGGER recruitment_applicant_tags_audit_ins
  AFTER INSERT ON public.recruitment_applicant_tags
  FOR EACH ROW EXECUTE FUNCTION public.recruitment_applicant_tag_audit();

CREATE TRIGGER recruitment_applicant_tags_audit_del
  AFTER DELETE ON public.recruitment_applicant_tags
  FOR EACH ROW EXECUTE FUNCTION public.recruitment_applicant_tag_audit();
