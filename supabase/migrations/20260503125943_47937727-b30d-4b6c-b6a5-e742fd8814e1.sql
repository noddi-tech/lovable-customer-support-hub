
-- ============================================================
-- Phase B3: Field mapping system + bulk historical import
-- ============================================================

-- ---------- 1. recruitment_custom_field_types (platform catalog) ----------
CREATE TABLE public.recruitment_custom_field_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type_key TEXT UNIQUE NOT NULL,
  display_name_en TEXT NOT NULL,
  display_name_no TEXT NOT NULL,
  supports_options BOOLEAN NOT NULL DEFAULT false,
  validation_schema JSONB NOT NULL DEFAULT '{}'::jsonb,
  ui_component TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.recruitment_custom_field_types ENABLE ROW LEVEL SECURITY;

CREATE POLICY "All authenticated can view field types"
  ON public.recruitment_custom_field_types FOR SELECT
  TO authenticated USING (true);

CREATE POLICY "Super admin inserts field types"
  ON public.recruitment_custom_field_types FOR INSERT
  TO authenticated WITH CHECK (public.has_role(auth.uid(), 'super_admin'::app_role));

CREATE POLICY "Super admin updates field types"
  ON public.recruitment_custom_field_types FOR UPDATE
  TO authenticated USING (public.has_role(auth.uid(), 'super_admin'::app_role));

CREATE POLICY "Super admin deletes field types"
  ON public.recruitment_custom_field_types FOR DELETE
  TO authenticated USING (public.has_role(auth.uid(), 'super_admin'::app_role));

CREATE TRIGGER trg_field_types_updated_at
  BEFORE UPDATE ON public.recruitment_custom_field_types
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

INSERT INTO public.recruitment_custom_field_types (type_key, display_name_en, display_name_no, supports_options, validation_schema, ui_component) VALUES
  ('text',          'Short text',     'Kort tekst',         false, '{"maxLength":255}',       'Input'),
  ('long_text',     'Long text',      'Lang tekst',         false, '{"maxLength":4000}',      'Textarea'),
  ('email',         'Email',          'E-post',             false, '{"format":"email"}',      'Input'),
  ('phone',         'Phone',          'Telefon',            false, '{"format":"phone"}',      'Input'),
  ('url',           'URL',            'URL',                false, '{"format":"url"}',        'Input'),
  ('number',        'Number',         'Tall',               false, '{"min":null,"max":null}', 'Input'),
  ('date',          'Date',           'Dato',               false, '{"format":"date"}',       'DatePicker'),
  ('datetime',      'Date & time',    'Dato og tid',        false, '{"format":"datetime"}',   'DateTimePicker'),
  ('boolean',       'Yes/No',         'Ja/Nei',             false, '{}',                       'Switch'),
  ('single_select', 'Single choice',  'Enkeltvalg',         true,  '{}',                       'Select'),
  ('multi_select',  'Multiple choice','Flervalg',           true,  '{}',                       'Combobox');

-- ---------- 2. recruitment_custom_fields ----------
CREATE TABLE public.recruitment_custom_fields (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  field_key TEXT NOT NULL,
  display_name TEXT NOT NULL,
  description TEXT NULL,
  type_id UUID NOT NULL REFERENCES public.recruitment_custom_field_types(id) ON DELETE RESTRICT,
  options JSONB NULL,
  validation_overrides JSONB NULL,
  is_required BOOLEAN NOT NULL DEFAULT false,
  show_on_card BOOLEAN NOT NULL DEFAULT false,
  show_on_profile BOOLEAN NOT NULL DEFAULT true,
  display_order INT NOT NULL DEFAULT 0,
  created_by UUID NULL REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (organization_id, field_key)
);
CREATE INDEX idx_custom_fields_org ON public.recruitment_custom_fields(organization_id);

ALTER TABLE public.recruitment_custom_fields ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members view custom fields"
  ON public.recruitment_custom_fields FOR SELECT TO authenticated
  USING (public.is_organization_member(organization_id));

CREATE POLICY "Org admins insert custom fields"
  ON public.recruitment_custom_fields FOR INSERT TO authenticated
  WITH CHECK (
    public.is_organization_member(organization_id)
    AND (public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'super_admin'::app_role))
  );

CREATE POLICY "Org admins update custom fields"
  ON public.recruitment_custom_fields FOR UPDATE TO authenticated
  USING (
    public.is_organization_member(organization_id)
    AND (public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'super_admin'::app_role))
  );

CREATE POLICY "Org admins delete custom fields"
  ON public.recruitment_custom_fields FOR DELETE TO authenticated
  USING (
    public.is_organization_member(organization_id)
    AND (public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'super_admin'::app_role))
  );

CREATE TRIGGER trg_custom_fields_updated_at
  BEFORE UPDATE ON public.recruitment_custom_fields
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ---------- 3. recruitment_applicant_field_values ----------
CREATE TABLE public.recruitment_applicant_field_values (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  applicant_id UUID NOT NULL REFERENCES public.applicants(id) ON DELETE CASCADE,
  field_id UUID NOT NULL REFERENCES public.recruitment_custom_fields(id) ON DELETE CASCADE,
  value JSONB NOT NULL,
  raw_value TEXT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (applicant_id, field_id)
);
CREATE INDEX idx_field_values_applicant ON public.recruitment_applicant_field_values(applicant_id);
CREATE INDEX idx_field_values_field ON public.recruitment_applicant_field_values(field_id);

ALTER TABLE public.recruitment_applicant_field_values ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.recruitment_applicant_in_user_org(_applicant_id UUID)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.applicants a
    WHERE a.id = _applicant_id AND public.is_organization_member(a.organization_id)
  );
$$;

CREATE POLICY "Org members view field values"
  ON public.recruitment_applicant_field_values FOR SELECT TO authenticated
  USING (public.recruitment_applicant_in_user_org(applicant_id));

CREATE POLICY "Org members insert field values"
  ON public.recruitment_applicant_field_values FOR INSERT TO authenticated
  WITH CHECK (public.recruitment_applicant_in_user_org(applicant_id));

CREATE POLICY "Org members update field values"
  ON public.recruitment_applicant_field_values FOR UPDATE TO authenticated
  USING (public.recruitment_applicant_in_user_org(applicant_id));

CREATE POLICY "Org admins delete field values"
  ON public.recruitment_applicant_field_values FOR DELETE TO authenticated
  USING (
    public.recruitment_applicant_in_user_org(applicant_id)
    AND (public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'super_admin'::app_role))
  );

CREATE TRIGGER trg_field_values_updated_at
  BEFORE UPDATE ON public.recruitment_applicant_field_values
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ---------- 4. recruitment_field_mapping_templates ----------
CREATE TABLE public.recruitment_field_mapping_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT NULL,
  is_system BOOLEAN GENERATED ALWAYS AS (organization_id IS NULL) STORED,
  target_role_hint TEXT NULL,
  created_by UUID NULL REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_templates_org ON public.recruitment_field_mapping_templates(organization_id);

ALTER TABLE public.recruitment_field_mapping_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "View system or own org templates"
  ON public.recruitment_field_mapping_templates FOR SELECT TO authenticated
  USING (organization_id IS NULL OR public.is_organization_member(organization_id));

CREATE POLICY "Insert templates"
  ON public.recruitment_field_mapping_templates FOR INSERT TO authenticated
  WITH CHECK (
    (organization_id IS NULL AND public.has_role(auth.uid(), 'super_admin'::app_role))
    OR (
      organization_id IS NOT NULL
      AND public.is_organization_member(organization_id)
      AND (public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'super_admin'::app_role))
    )
  );

CREATE POLICY "Update templates"
  ON public.recruitment_field_mapping_templates FOR UPDATE TO authenticated
  USING (
    (organization_id IS NULL AND public.has_role(auth.uid(), 'super_admin'::app_role))
    OR (
      organization_id IS NOT NULL
      AND public.is_organization_member(organization_id)
      AND (public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'super_admin'::app_role))
    )
  );

CREATE POLICY "Delete templates"
  ON public.recruitment_field_mapping_templates FOR DELETE TO authenticated
  USING (
    (organization_id IS NULL AND public.has_role(auth.uid(), 'super_admin'::app_role))
    OR (
      organization_id IS NOT NULL
      AND public.is_organization_member(organization_id)
      AND (public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'super_admin'::app_role))
    )
  );

CREATE TRIGGER trg_templates_updated_at
  BEFORE UPDATE ON public.recruitment_field_mapping_templates
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ---------- 5. recruitment_field_mapping_template_items ----------
CREATE TABLE public.recruitment_field_mapping_template_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id UUID NOT NULL REFERENCES public.recruitment_field_mapping_templates(id) ON DELETE CASCADE,
  meta_question_pattern TEXT NOT NULL,
  target_kind TEXT NOT NULL CHECK (target_kind IN ('standard','custom','metadata_only')),
  target_standard_field TEXT NULL CHECK (target_standard_field IS NULL OR target_standard_field IN ('full_name','email','phone_number')),
  target_custom_field_key TEXT NULL,
  target_custom_field_type_key TEXT NULL,
  display_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_template_items_template ON public.recruitment_field_mapping_template_items(template_id, display_order);

ALTER TABLE public.recruitment_field_mapping_template_items ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.recruitment_template_accessible(_template_id UUID)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.recruitment_field_mapping_templates t
    WHERE t.id = _template_id
      AND (t.organization_id IS NULL OR public.is_organization_member(t.organization_id))
  );
$$;

CREATE OR REPLACE FUNCTION public.recruitment_template_writable(_template_id UUID)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.recruitment_field_mapping_templates t
    WHERE t.id = _template_id
      AND (
        (t.organization_id IS NULL AND public.has_role(auth.uid(), 'super_admin'::app_role))
        OR (
          t.organization_id IS NOT NULL
          AND public.is_organization_member(t.organization_id)
          AND (public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'super_admin'::app_role))
        )
      )
  );
$$;

CREATE POLICY "View template items"
  ON public.recruitment_field_mapping_template_items FOR SELECT TO authenticated
  USING (public.recruitment_template_accessible(template_id));

CREATE POLICY "Insert template items"
  ON public.recruitment_field_mapping_template_items FOR INSERT TO authenticated
  WITH CHECK (public.recruitment_template_writable(template_id));

CREATE POLICY "Update template items"
  ON public.recruitment_field_mapping_template_items FOR UPDATE TO authenticated
  USING (public.recruitment_template_writable(template_id));

CREATE POLICY "Delete template items"
  ON public.recruitment_field_mapping_template_items FOR DELETE TO authenticated
  USING (public.recruitment_template_writable(template_id));

-- ---------- 6. recruitment_form_field_mappings ----------
CREATE TABLE public.recruitment_form_field_mappings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  form_mapping_id UUID NOT NULL REFERENCES public.recruitment_meta_form_mappings(id) ON DELETE CASCADE,
  meta_question_id TEXT NOT NULL,
  meta_question_text TEXT NOT NULL,
  target_kind TEXT NOT NULL CHECK (target_kind IN ('standard','custom','metadata_only')),
  target_standard_field TEXT NULL CHECK (target_standard_field IS NULL OR target_standard_field IN ('full_name','email','phone_number')),
  target_custom_field_id UUID NULL REFERENCES public.recruitment_custom_fields(id) ON DELETE SET NULL,
  display_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (form_mapping_id, meta_question_id)
);
CREATE INDEX idx_form_field_mappings_form ON public.recruitment_form_field_mappings(form_mapping_id);

ALTER TABLE public.recruitment_form_field_mappings ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.recruitment_form_mapping_in_user_org(_form_mapping_id UUID)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.recruitment_meta_form_mappings fm
    WHERE fm.id = _form_mapping_id AND public.is_organization_member(fm.organization_id)
  );
$$;

CREATE POLICY "View form field mappings"
  ON public.recruitment_form_field_mappings FOR SELECT TO authenticated
  USING (public.recruitment_form_mapping_in_user_org(form_mapping_id));

CREATE POLICY "Org admins insert form field mappings"
  ON public.recruitment_form_field_mappings FOR INSERT TO authenticated
  WITH CHECK (
    public.recruitment_form_mapping_in_user_org(form_mapping_id)
    AND (public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'super_admin'::app_role))
  );

CREATE POLICY "Org admins update form field mappings"
  ON public.recruitment_form_field_mappings FOR UPDATE TO authenticated
  USING (
    public.recruitment_form_mapping_in_user_org(form_mapping_id)
    AND (public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'super_admin'::app_role))
  );

CREATE POLICY "Org admins delete form field mappings"
  ON public.recruitment_form_field_mappings FOR DELETE TO authenticated
  USING (
    public.recruitment_form_mapping_in_user_org(form_mapping_id)
    AND (public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'super_admin'::app_role))
  );

-- ---------- 7. recruitment_bulk_imports ----------
CREATE TABLE public.recruitment_bulk_imports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  integration_id UUID NOT NULL REFERENCES public.recruitment_meta_integrations(id) ON DELETE CASCADE,
  form_mapping_ids UUID[] NOT NULL,
  since_date TIMESTAMPTZ NOT NULL,
  until_date TIMESTAMPTZ NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','running','completed','failed','cancelled')),
  approval_mode TEXT NOT NULL DEFAULT 'direct' CHECK (approval_mode IN ('direct','quarantine')),
  imported_pipeline_stage_id UUID NULL,
  total_leads_found INT NULL,
  total_leads_imported INT NOT NULL DEFAULT 0,
  total_leads_skipped_duplicate INT NOT NULL DEFAULT 0,
  total_leads_skipped_unmapped INT NOT NULL DEFAULT 0,
  total_leads_failed INT NOT NULL DEFAULT 0,
  error_message TEXT NULL,
  started_at TIMESTAMPTZ NULL,
  completed_at TIMESTAMPTZ NULL,
  created_by UUID NULL REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_bulk_imports_org ON public.recruitment_bulk_imports(organization_id);
CREATE INDEX idx_bulk_imports_integration ON public.recruitment_bulk_imports(integration_id);

ALTER TABLE public.recruitment_bulk_imports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members view bulk imports"
  ON public.recruitment_bulk_imports FOR SELECT TO authenticated
  USING (public.is_organization_member(organization_id));

CREATE POLICY "Org admins create bulk imports"
  ON public.recruitment_bulk_imports FOR INSERT TO authenticated
  WITH CHECK (
    public.is_organization_member(organization_id)
    AND (public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'super_admin'::app_role))
  );

CREATE POLICY "Org admins update bulk imports"
  ON public.recruitment_bulk_imports FOR UPDATE TO authenticated
  USING (
    public.is_organization_member(organization_id)
    AND (public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'super_admin'::app_role))
  );

CREATE TRIGGER trg_bulk_imports_updated_at
  BEFORE UPDATE ON public.recruitment_bulk_imports
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE FUNCTION public.recruitment_bulk_import_validate_window()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public
AS $$
BEGIN
  IF NEW.until_date < NEW.since_date THEN
    RAISE EXCEPTION 'until_date must be at or after since_date';
  END IF;
  IF NEW.until_date - NEW.since_date > INTERVAL '90 days' THEN
    RAISE EXCEPTION 'Bulk import window cannot exceed 90 days (Meta API limit)';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_bulk_imports_validate_window
  BEFORE INSERT OR UPDATE ON public.recruitment_bulk_imports
  FOR EACH ROW EXECUTE FUNCTION public.recruitment_bulk_import_validate_window();

-- ---------- 8. recruitment_bulk_import_lead_log ----------
CREATE TABLE public.recruitment_bulk_import_lead_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bulk_import_id UUID NOT NULL REFERENCES public.recruitment_bulk_imports(id) ON DELETE CASCADE,
  form_mapping_id UUID NOT NULL,
  meta_lead_id TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('pending','imported','duplicate','unmapped','failed')),
  applicant_id UUID NULL REFERENCES public.applicants(id) ON DELETE SET NULL,
  error_message TEXT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (bulk_import_id, meta_lead_id)
);
CREATE INDEX idx_lead_log_status ON public.recruitment_bulk_import_lead_log(bulk_import_id, status);

ALTER TABLE public.recruitment_bulk_import_lead_log ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.recruitment_bulk_import_in_user_org(_bulk_import_id UUID)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.recruitment_bulk_imports bi
    WHERE bi.id = _bulk_import_id AND public.is_organization_member(bi.organization_id)
  );
$$;

CREATE POLICY "Org members view lead log"
  ON public.recruitment_bulk_import_lead_log FOR SELECT TO authenticated
  USING (public.recruitment_bulk_import_in_user_org(bulk_import_id));

-- ---------- 9. applicants extensions ----------
ALTER TABLE public.applicants
  ADD COLUMN IF NOT EXISTS imported_via TEXT NULL CHECK (imported_via IS NULL OR imported_via IN ('webhook','bulk_import','manual')),
  ADD COLUMN IF NOT EXISTS imported_via_bulk_import_id UUID NULL REFERENCES public.recruitment_bulk_imports(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS import_status TEXT NULL CHECK (import_status IS NULL OR import_status IN ('pending_review','approved'));

CREATE INDEX IF NOT EXISTS idx_applicants_import_status ON public.applicants(organization_id, import_status) WHERE import_status IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_applicants_bulk_import ON public.applicants(imported_via_bulk_import_id) WHERE imported_via_bulk_import_id IS NOT NULL;
