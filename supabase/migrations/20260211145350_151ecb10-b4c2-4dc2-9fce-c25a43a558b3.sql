
-- Table for storing custom block configurations created via the admin UI
CREATE TABLE public.widget_block_configs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  type_key TEXT NOT NULL,
  label TEXT NOT NULL,
  icon TEXT NOT NULL DEFAULT '🔧',
  description TEXT,
  marker TEXT NOT NULL,
  closing_marker TEXT,
  field_type TEXT,
  requires_api BOOLEAN NOT NULL DEFAULT false,
  api_endpoints JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_by_id UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- RLS
ALTER TABLE public.widget_block_configs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view block configs for their org"
  ON public.widget_block_configs FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id FROM public.profiles WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create block configs for their org"
  ON public.widget_block_configs FOR INSERT
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM public.profiles WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update block configs for their org"
  ON public.widget_block_configs FOR UPDATE
  USING (
    organization_id IN (
      SELECT organization_id FROM public.profiles WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete block configs for their org"
  ON public.widget_block_configs FOR DELETE
  USING (
    organization_id IN (
      SELECT organization_id FROM public.profiles WHERE user_id = auth.uid()
    )
  );

-- Unique constraint per org
CREATE UNIQUE INDEX idx_widget_block_configs_org_type ON public.widget_block_configs(organization_id, type_key);
