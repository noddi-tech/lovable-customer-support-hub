ALTER TABLE public.recruitment_form_field_mappings
  ADD COLUMN IF NOT EXISTS meta_question_key TEXT NULL;

CREATE INDEX IF NOT EXISTS idx_recruitment_form_field_mappings_form_key
  ON public.recruitment_form_field_mappings (form_mapping_id, meta_question_key);